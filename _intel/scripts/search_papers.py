import urllib.request
import urllib.parse
import json

def search_s2(query, limit=5):
    encoded_query = urllib.parse.quote(query)
    url = f"https://api.semanticscholar.org/graph/v1/paper/search?query={encoded_query}&limit={limit}&fields=title,authors,year,abstract,tldr"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            for p in data.get('data', []):
                authors = ", ".join([a.get('name', '') for a in p.get('authors', [])])
                title = p.get('title')
                year = p.get('year')
                abstract = p.get('abstract') 
                if not abstract and p.get('tldr'):
                    abstract = p.get('tldr').get('text')
                print(f"Title: {title}")
                print(f"Authors: {authors}")
                print(f"Year: {year}")
                print(f"Abstract: {abstract}")
                print("-" * 80)
    except Exception as e:
        print(f"Error for '{query}': {e}")

print("=== LOGAN BLUE METHODOLOGY ===")
search_s2("Who Are You I Really Wanna Know Detecting Audio DeepFakes Through Vocal Tract Reconstruction", 3)

print("\n=== ARTICULATORY FEATURES FOR SPOOFING ===")
search_s2("articulatory features spoofing detection deepfake", 5)

print("\n=== EMA SYNTHETIC VS NATURAL & JERK ===")
search_s2("articulatory jerk synthetic natural speech", 5)
search_s2("electromagnetic articulography synthetic speech detection", 5)

print("\n=== PETER WU / ALAN BLACK FORENSICS ===")
search_s2("Peter Wu Alan Black articulatory synthesis deepfake", 5)

