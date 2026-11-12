---
layout: single
title: "Research"
permalink: /research/
author_profile: true
---
{% include base_path %}
<div class="rs-wide" markdown="1">

<div class="rs-pagehead" markdown="1">


Here are a few summaries of topics I’ve been exploring lately. I've also included interactive demos for some of them so you can try them out yourself.

</div>

<ol class="rs-papers rs-papers--index" markdown="0">
{% assign pubs = site.publications | sort: "date" | reverse %}
{% for p in pubs %}
  <li class="rs-paper">
    <a class="rs-paper__thumb" href="{{ base_path }}{{ p.url }}" tabindex="-1" aria-hidden="true">{% include rs-icon.html paper=p %}</a>
    <div>
      <h2 class="rs-paper__title"><a href="{{ base_path }}{{ p.url }}">{{ p.title }}</a></h2>
      <p class="rs-paper__authors">{{ p.authors }}. {{ p.arxiv_id }}, {{ p.date | date: "%Y" }}.</p>
      {% if p.status %}<p class="rs-status{% if p.category == 'journal' %} is-accepted{% endif %}">{{ p.status }}</p>{% endif %}
      <p class="rs-paper__summary">{{ p.summary }}</p>
      <div class="rs-sw-list__badges">
        <a class="rs-pill" href="{{ base_path }}{{ p.url }}">{% if p.has_demo %}Read more &amp; try the demo{% else %}Read more{% endif %}</a>
        {% if p.bibtex %}<button type="button" class="rs-pill" data-bibtex>BibTeX</button><pre class="rs-bib" hidden>{{ p.bibtex | escape }}</pre>{% endif %}
        {% if p.arxiv %}<a class="rs-pill" href="{{ p.arxiv }}">Preprint</a>{% endif %}
        {% if p.code %}<a class="rs-pill" href="{{ p.code }}">Code, Data &amp; Results</a>{% endif %}
      </div>
    </div>
  </li>
{% endfor %}
</ol>

</div>

<script type="module" src="{{ base_path }}/assets/js/demos/thumbs.js"></script>
{% include rs-bibtex.html %}
