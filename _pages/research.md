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
      <p class="rs-paper__links">
        <a href="{{ base_path }}{{ p.url }}">{% if p.has_demo %}Read more and try the demo{% else %}Read more{% endif %}</a>
        <a href="{{ p.arxiv }}">arXiv</a>
        {% if p.code %}<a href="{{ p.code }}">Code</a>{% endif %}
      </p>
    </div>
  </li>
{% endfor %}
</ol>

</div>

<script type="module" src="{{ base_path }}/assets/js/demos/thumbs.js"></script>
