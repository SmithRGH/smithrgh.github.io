# Rudi Smith: academic website

The source of [smithrgh.github.io](https://smithrgh.github.io), built on the [Academic Pages](https://github.com/academicpages/academicpages.github.io) Jekyll template, with custom styling and interactive demos for some of my papers.

## How changes go live

Every commit to `master` runs the workflow in `.github/workflows/jekyll.yml`, which builds the site and publishes it to GitHub Pages. Changes appear about two minutes later. The **Actions** tab shows each build. A red cross means the build failed: click it to see the error. The live site keeps the last version that built.

## Where things live

| What | File |
|---|---|
| Home page text and "About me" | `_pages/about.md` |
| Research page introduction | `_pages/research.md` |
| Papers: one file each, with the summary, links and the article text | `_publications/` |
| Software (code and data packages) | `_data/software.yml` |
| Conference contributions | `_talks/` |
| Teaching | `_teaching/` |
| CV page (Education and Experience) | `_data/cv.yml` |
| Full CV | `files/Rudi_Smith_CV.pdf` |
| Profile photo | `images/profile.png` |
| Sidebar bio and links, site name | `_config.yml` |
| Menu bar (pages and their order) | `_data/navigation.yml` |
| Menu bar layout | `_includes/masthead.html` |
| Colours, fonts and layout, including phones | `_sass/layout/_rudi.scss` |
| Fonts used by the theme | `_sass/_themes.scss` |
| Demos and paper icons | `assets/js/demos/` |
| Image shown when the link is shared | `images/og-image.png` |

## Common edits

**Add a paper.** Copy a file in `_publications/` and change the settings between the two `---` lines:

- `summary` is the paragraph on the Home and Research pages.
- `thumb` picks the icon: `adi`, `tucker`, `attention` or `gmres`.
- `category` is `journal`, `submitted` or `preprints`.
- `permalink` must be new: it is the article's address.

Everything below the second `---` is the article page.

**Add a code package.** Copy an entry in `_data/software.yml`, keeping the list newest first:

- `authors` as on Zenodo. "R. Smith" is shown in bold automatically.
- `title`, `version`, `date` and `doi` (without `https://doi.org/`).
- `record` is the number in the Zenodo address, and is used for the BibTeX button.
- `paper` is the article page on this site, or any web address.
- `license` is shown as a badge. Leave it empty for no badge.

**Add a conference contribution.** Copy a file in `_talks/`:

- `kind` is `talk`, `poster` or `workshop`, and picks the section.
- `date` is the first day. It sets the order, and a talk dated in the future is listed under Upcoming.
- `dates`, `venue`, `location`, `role` and `talk_title` are shown as written.
- `paper` (optional) links the title to an article page.

**Add a teaching entry.** Copy a file in `_teaching/`. `items` is an optional list of courses.

**Update the CV.** Upload the new PDF with the same name, `files/Rudi_Smith_CV.pdf`.

**Add a page to the menu.** Add its title and address to `_data/navigation.yml`. On phones, the menu is one row that you swipe sideways.

**Change the photo.** Upload a square image named `profile.png` to `images/`.

Talk and teaching files only feed the lists, so any text below their second `---` is not shown anywhere.

## Things to know

- The site's own styles are in `_sass/layout/_rudi.scss`. If that file is missing, the build fails with "Can't find stylesheet to import".
- `assets/js/main.min.js` is not stored here: the build makes it each time.
- The template's sample posts, papers, talks and pages are kept but switched off with `published: false`.

## Preview on your own computer (optional)

This needs Ruby, Bundler and Node.js.

```bash
npm install -g uglify-js
uglifyjs assets/js/plugins/jquery.greedy-navigation.js assets/js/_main.js assets/js/theme.js -c -m -o assets/js/main.min.js
bundle install
bundle exec jekyll serve
```

Then open http://localhost:4000.

## Credits

The theme is Academic Pages, a fork of Minimal Mistakes by Michael Rose. Its code is under the MIT licence in `LICENSE`. The site's content (text, CV and images) is © Rudi Smith.
