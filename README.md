# Quiet Pitch

A spoiler-free football scores site. Plain HTML, CSS and JavaScript: no build step.
Out of the box it shows made-up demo data. Follow "Going live" below to show real Premier League fixtures and results.

## What each file does (and what to swap)

| File | Job | Swap or edit it when... |
|---|---|---|
| `index.html` | Page shell and the spoiler-warning popup | You change the layout or menu |
| `style.css` | All colours, spacing and fonts | You want a different look |
| `app.js` | Pages and logic. Spoiler handling is in its own marked section | You add or change features |
| `teams.js` | Optional club colour overrides (names come from the data) | You want a specific colour for a club |
| `ratings.js` | Where "worth watching" scores and votes come from | You move to shared votes or a calculated score |
| `sample-data.js` | Made-up demo fixtures, used only when there is no real data | Never needed once real data works |
| `scripts/fetch-matches.js` | The data job: fetches fixtures/results and writes `matches.json` | You add leagues or change the data source |
| `github-setup/site.yml` | The schedule: runs the data job every 30 minutes and publishes the site | You change how often it updates |

## Going live with real data (one-time setup, about 10 minutes)

You need a free GitHub account and a free football-data.org API key.

1. **Create a repository.** On github.com click **+** (top right) > **New repository**. Name it `quiet-pitch`, choose **Public**, and click **Create repository**. (Public is required for free GitHub Pages hosting. Your API key is never stored in the repository.)
2. **Upload the files.** On the new repository page click **uploading an existing file**. Drag in everything from inside the `quiet-pitch` folder (all the files plus the `scripts` and `github-setup` folders), then click **Commit changes**.
3. **Add the schedule file.** Click **Add file** > **Create new file**. In the name box type exactly `.github/workflows/site.yml` (typing the slashes creates the folders). Open `github-setup/site.yml`, copy everything in it, paste it into the big box, and click **Commit changes**. This will start a run that fails because steps 4 and 5 aren't done yet. That is expected.
4. **Turn on GitHub Pages.** Go to **Settings** > **Pages**. Under **Build and deployment**, set **Source** to **GitHub Actions**.
5. **Add your API key as a secret.** Go to **Settings** > **Secrets and variables** > **Actions** > **New repository secret**. Name: `FOOTBALL_DATA_KEY`. Secret: paste your football-data.org key. Click **Add secret**.
6. **Run it.** Go to the **Actions** tab, click **Update site** in the left list, then **Run workflow** > **Run workflow**. After a minute or two it should show a green tick. Your site is at `https://YOUR-USERNAME.github.io/quiet-pitch/`.

From then on it refreshes itself every 30 minutes. If a fetch ever fails, nothing is published and the site keeps its last good version.

## Adding more competitions

Open `scripts/fetch-matches.js` and add a line to `LEAGUES` (some are already there, commented out). Each one needs one call a minute-fraction on the free plan, which is well within the limit. A competition switcher appears in the site header automatically once there is more than one. Competitions that are not a normal league (the Champions League) need `table: false`.

## Notes

- Spoiler settings are never saved between visits; the site always opens with scores hidden. Live scores are never shown or stored.
- Saved games, votes and settings are stored only in the visitor's own browser.
- Real data has no watch ratings yet, so "Top games" is empty until a ratings source is added (`ratings.js`).
- Team badges are deliberately not used (they are trademarked); the coloured circles are original.
- football-data.org asks for a visible credit; the site adds it to the footer automatically.
