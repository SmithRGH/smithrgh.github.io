---
permalink: /
title: "Home"
hide_title: true
layout: single
author_profile: true
redirect_from:
  - /about/
  - /about.html
---
{% include base_path %}
<section class="rs-intro-wide">
  <p class="rs-hero__intro">My name is Rudi Smith and I am a third year PhD student in applied mathematics at Virginia Tech, advised by <a href="https://math.vt.edu/people/faculty/werner-steffen.html">Steffen W. R. Werner</a> and <a href="https://www.math.vt.edu/people/faculty/miedlar-agnieszka.html">Agnieszka Międlar</a>. My research is on randomized tensor methods and numerical linear algebra for model reduction.</p>
  <p class="rs-hero__intro">Prior to my current research, I completed my integrated master's degree in Mathematics at the University of Oxford. During my time there, I was supervised by <a href="https://people.maths.ox.ac.uk/nakatsukasa/">Yuji Nakatsukasa</a>, focusing on trace estimation algorithms.</p>
</section>

<section class="rs-lucky-section" aria-labelledby="papers" data-lucky> 
  <div class="rs-lucky-section__head"> 
    <h2 id="papers">Explore some of my work</h2> 
    <button type="button" class="rs-btn rs-btn--lucky" data-lucky-go><i class="fas fa-dice-five" aria-hidden="true"></i> Random paper</button> 
  </div> 
  <p class="rs-lucky-section__hint">Pick a paper at random.</p> 
  <ul class="rs-tiles"> 
  {% assign pubs = site.publications | sort: "date" | reverse %} 
  {% for p in pubs %} 
    <li> 
      <button type="button" class="rs-tile" data-tile aria-haspopup="dialog" aria-label="{{ p.title }}" title="{{ p.title }}"> 
        {% include rs-icon.html paper=p class="rs-tile__thumb" %} 
      </button> 
      <div class="rs-tile__more" hidden> 
        <h3 class="rs-card__title">{{ p.title }}</h3> 
        <p class="rs-card__authors">{{ p.authors }}</p> 
        {% if p.status %}<p class="rs-status{% if p.category == 'journal' %} is-accepted{% endif %}">{{ p.status }}</p>{% endif %} 
        <p class="rs-card__summary">{{ p.summary }}</p> 
        <p class="rs-card__links"> 
          <a class="rs-btn rs-btn--primary" href="{{ base_path }}{{ p.url }}">{% if p.has_demo %}Read the article and try the demo{% else %}Read the article{% endif %}</a> 
          <a href="{{ p.arxiv }}">arXiv</a> 
          {% if p.code %}<a href="{{ p.code }}">Code</a>{% endif %} 
        </p> 
      </div> 
    </li> 
  {% endfor %} 
  </ul> 

  <div class="rs-lucky" data-lucky-overlay hidden> 
    <div class="rs-lucky__backdrop" data-lucky-close></div> 
    <div class="rs-lucky__card" role="dialog" aria-modal="true" aria-labelledby="lucky-title"> 
      <div class="rs-lucky__thumb"><canvas></canvas></div> 
      <div class="rs-lucky__body"></div> 
      <div class="rs-lucky__actions"> 
        <button type="button" class="rs-btn" data-lucky-again><i class="fas fa-dice-five" aria-hidden="true"></i> Another random paper</button> 
        <button type="button" class="rs-btn" data-lucky-close aria-label="Close">Close</button> 
      </div> 
    </div> 
  </div> 
</section>

<section class="rs-aboutme" aria-labelledby="about">
  <h2 id="about">About me</h2>
  <p>Originally from the UK, I grew up in a small, rural village in southwest England (filled with lots of beautiful cows and a cozy village pub).</p>
  <p>I’ve loved solving puzzles and playing games for as long as I can remember and have always been encouraged to be curious. Today, you can usually find me attempting cryptic crosswords (badly), playing Scrabble in my favourite coffee shop, or working through the daily NYT games.</p>
  <p>Outside of puzzles, I love running. Whether I’m meeting new people, chatting with friends, listening to music, or just running for fun, getting outdoors always brings me joy.</p>
</section>

<script type="module" src="{{ base_path }}/assets/js/demos/thumbs.js"></script>
<script type="module" src="{{ base_path }}/assets/js/demos/lucky.js"></script>
