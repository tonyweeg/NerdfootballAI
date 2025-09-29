# NFL Team Logo Scraper

Downloads all NFL team logos from ESPN's teams page.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

## Usage

### Run Tests (Recommended First)
```bash
python test_scraper.py
```

### Download Team Logos
```bash
python nfl_team_scraper.py
```

## Output

- Team logos will be saved to `~/Downloads/nfl_team_logos/` by default
- The scraper will create the directory if it doesn't exist
- Progress will be shown during download

## Features

- Handles relative and absolute URLs
- Deduplicates identical images
- Generates meaningful filenames
- Respectful request timing (0.5s between downloads)
- Error handling and progress reporting

## Files

- `nfl_team_scraper.py` - Main scraper class
- `test_scraper.py` - Test suite
- `requirements.txt` - Python dependencies
- `README.md` - This file
