import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
import time
import json

def search_arxiv(query, max_results=3):
    print(f"Searching arXiv for: {query}")
    url = f"http://export.arxiv.org/api/query?search_query=all:{urllib.parse.quote(query)}&max_results={max_results}"
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            xml_data = response.read()
            root = ET.fromstring(xml_data)
            for entry in root.findall('{http://www.w3.org/2005/Atom}entry'):
                title = entry.find('{http://www.w3.org/2005/Atom}title').text.replace('\n', ' ')
                authors = [author.find('{http://www.w3.org/2005/Atom}name').text for author in entry.findall('{http://www.w3.org/2005/Atom}author')]
                summary = entry.find('{http://www.w3.org/2005/Atom}summary').text.replace('\n', ' ')
                published = entry.find('{http://www.w3.org/2005/Atom}published').text
                print(f"Title: {title}\nAuthors: {', '.join(authors)}\nYear: {published[:4]}\nAbstract: {summary[:500]}...\n{'-'*80}")
    except Exception as e:
        print(f"Error: {e}")

def search_s2_safe(query, limit=3):
    print(f"Searching Semantic Scholar for: {query}")
    encoded_query = urllib.parse.quote(query)
    url = f"https://api.semanticscholar.org/graph/v1/paper/search?query={encoded_query}&limit={limit}&fields=title,authors,year,abstract,tldr"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            for p in data.get('data', []):
                authors = ", ".join([a.get('name', '') for a in p.get('authors', [])])
                title = p.get('title')
                year = p.get('year')
                abstract = p.get('abstract') or (p.get('tldr').get('text') if p.get('tldr') else '')
                print(f"Title: {title}\nAuthors: {authors}\nYear: {year}\nAbstract: {abstract[:500]}...\n{'-'*80}")
    except Exception as e:
        print(f"Error: {e}")

search_arxiv("articulatory deepfake")
time.sleep(1)
search_arxiv("vocal tract deepfake")
time.sleep(1)
search_arxiv("acoustic-to-articulatory deepfake")
time.sleep(1)
search_arxiv("Peter Wu articulatory")
time.sleep(1)

search_s2_safe("articulatory features deepfake detection", 3)
time.sleep(2)
search_s2_safe("articulatory jerk synthetic speech", 3)

