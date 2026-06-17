import os
import time
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Cache configuration
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_DURATION = 300  # Cache feed for 5 minutes in memory
cache = {
    "data": None,
    "last_fetched": 0
}

def clean_html_content(html_str):
    """
    Optional helper to clean up formatting issues in XML CDATA content if needed.
    """
    if not html_str:
        return ""
    # Standard XML decoding is handled by ET.fromstring, but we make sure whitespace is tidy
    return html_str.strip()

def fetch_and_parse_feed(force_refresh=False):
    global cache
    current_time = time.time()
    
    # Return cache if valid and refresh not forced
    if cache["data"] is not None and (current_time - cache["last_fetched"] < CACHE_DURATION) and not force_refresh:
        return cache["data"], "cached"
    
    req = urllib.request.Request(
        FEED_URL,
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
        }
    )
    
    try:
        # Fetch xml content with 10s timeout
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
    except urllib.error.URLError as e:
        # Fallback to cache if feed is down
        if cache["data"] is not None:
            return cache["data"], "fallback_cache_after_error"
        raise Exception(f"Failed to fetch feed and no cached data available: {str(e)}")
    except Exception as e:
        if cache["data"] is not None:
            return cache["data"], "fallback_cache_after_error"
        raise Exception(f"An unexpected error occurred during fetch: {str(e)}")

    try:
        root = ET.fromstring(xml_data)
    except ET.ParseError as e:
        if cache["data"] is not None:
            return cache["data"], "fallback_cache_after_error"
        raise Exception(f"Failed to parse XML response from source feed: {str(e)}")

    entries = []
    # Atom feeds use this namespace
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    # Loop over entries
    for entry in root.findall('atom:entry', ns):
        # Title
        title_el = entry.find('atom:title', ns)
        raw_title = title_el.text if title_el is not None else "Untitled Update"
        
        # Link
        link_el = entry.find('atom:link', ns)
        link = ""
        if link_el is not None:
            link = link_el.attrib.get('href', '')
            # Sometimes atom links use self or alternate rel, we just grab the href
            
        # ID
        id_el = entry.find('atom:id', ns)
        id_val = id_el.text if id_el is not None else ''
        
        # Updated Date
        updated_el = entry.find('atom:updated', ns)
        updated = updated_el.text if updated_el is not None else ''
        
        # Content / Summary
        content_el = entry.find('atom:content', ns)
        if content_el is None:
            content_el = entry.find('atom:summary', ns)
        
        content = content_el.text if content_el is not None else ''
        
        # Parse Categories from Title
        # Standard format in GCP notes: "Feature: BigQuery supports X", "Announcement: Deprecating Y"
        category = "Update"
        clean_title = raw_title
        if ":" in raw_title:
            parts = raw_title.split(":", 1)
            cat_candidate = parts[0].strip()
            # Verify if it's a known category keyword or reasonably short
            keywords = ['feature', 'deprecat', 'announc', 'chang', 'fix', 'resolv', 'improv', 'security', 'beta', 'preview', 'ga', 'support']
            if len(cat_candidate) < 20 and any(kw in cat_candidate.lower() for kw in keywords):
                category = cat_candidate
                clean_title = parts[1].strip()
        
        entries.append({
            'id': id_val,
            'title': clean_title,
            'raw_title': raw_title,
            'category': category,
            'link': link,
            'updated': updated,
            'content': clean_html_content(content)
        })
        
    cache["data"] = entries
    cache["last_fetched"] = current_time
    return entries, "fresh"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    force_refresh = request.args.get('force_refresh', 'false').lower() == 'true'
    try:
        entries, status = fetch_and_parse_feed(force_refresh=force_refresh)
        return jsonify({
            "success": True,
            "status": status,
            "last_updated": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(cache["last_fetched"])),
            "last_fetched_epoch": cache["last_fetched"],
            "count": len(entries),
            "data": entries
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    # Default Flask port is 5000
    app.run(host='127.0.0.1', port=5000, debug=True)
