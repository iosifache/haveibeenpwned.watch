# `haveibeenpwned.watch`

[Open source](https://github.com/iosifache/haveibeenpwned.watch), no-fluff charts showcasing [`haveibeenpwned.com`](https://haveibeenpwned.com)'s pwned account data.

## Tech Stack

- Vanilla HTML, CSS, and JS
- [chota](https://jenil.github.io/chota/) as a micro CSS framework
- [Chart.js](https://www.chartjs.org) for plotting
- Grok 3 for website classification

<details>

<summary>Click here for revealing how the website classification is performed.</summary>

<br/>

The next command is used to extract all URLs:

```bash
cat index.json | jq -r ".[] | .Domain" | sort | uniq > domains.csv
(echo "domain" && cat domains.csv) > domains.csv.bak && mv domains.csv.bak domains.csv
```

The Grok prompt is the following:

> Create a new column with the CSV file with the classification of every domain. The categories should be succesing, 1-3 words, and maximise reuse while keeping the accuracy.

</details>

## TODO

- [ ] Create a GitHub Action for updating the HIBP data
- [ ] Find an alternative for website classification
