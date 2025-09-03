# Setting Up NerdfootballAI on a Second Computer

## Prerequisites
- Git installed
- Python 3.x installed
- Firebase CLI installed (for deployment)
- GitHub account with access to the repository

## Setup Steps

### 1. Clone the Repository
```bash
# Navigate to where you want the project
cd ~/nerdfootball-project/

# Clone the repository
git clone https://github.com/tonyweeg/NerdfootballAI.git

# Enter the project directory
cd NerdfootballAI
```

### 2. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure Firebase (if deploying)
```bash
# Login to Firebase
firebase login

# The .firebaserc file already exists in the repo
# This connects to your existing Firebase project
```

### 4. Verify Setup
```bash
# Test the Python scraper
python test_scraper.py

# Check git status
git status

# Pull latest changes
git pull origin main
```

## Working with Git Across Two Computers

### Before Starting Work
Always pull the latest changes:
```bash
git pull origin main
```

### After Making Changes
```bash
# Add your changes
git add .

# Commit with a descriptive message
git commit -m "Description of changes"

# Push to GitHub
git push origin main
```

### Important Notes
- Always pull before starting work to avoid conflicts
- Commit and push frequently to keep both computers in sync
- The `.gitignore` file ensures sensitive files aren't shared
- Firebase config is already in the repo (`.firebaserc`, `firebase.json`)

## Project Structure
- `/public/` - Static website files (HTML, CSS, JS)
- `nfl_team_scraper.py` - Main Python scraper
- `test_scraper.py` - Test suite
- `requirements.txt` - Python dependencies
- `firebase.json` - Firebase hosting configuration
- `.firebaserc` - Firebase project configuration

## Deployment
To deploy to Firebase hosting from either computer:
```bash
firebase deploy --only hosting
```

## Troubleshooting

### Merge Conflicts
If you get merge conflicts:
1. Pull the latest changes: `git pull origin main`
2. Resolve conflicts in your editor
3. Add resolved files: `git add .`
4. Commit the merge: `git commit -m "Resolved merge conflicts"`
5. Push: `git push origin main`

### Permission Issues
If you get permission denied for GitHub:
- Ensure you're logged into the correct GitHub account
- Check SSH keys or use HTTPS with credentials
- For HTTPS, you may need a personal access token

### Python Module Not Found
If Python modules aren't found:
```bash
pip install -r requirements.txt --upgrade
```