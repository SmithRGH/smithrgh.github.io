---
layout: archive
title: "Curriculum Vitae"
permalink: /cv/
author_profile: true
redirect_from:
  - /resume
---
{% include base_path %}

<div class="rs-cv" markdown="0">
<p class="rs-cv__intro">The full version of my CV can be found <a href="{{ base_path }}/files/Rudi_Smith_CV.pdf">here</a>.</p>

<h2 class="rs-cvhead">Education</h2>
{% for e in site.data.cv.education %}{% include rs-cvrow.html item=e %}{% endfor %}

<h2 class="rs-cvhead">Experience</h2>
{% for e in site.data.cv.experience %}{% include rs-cvrow.html item=e %}{% endfor %}

</div>
