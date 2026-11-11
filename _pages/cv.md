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
<h2 class="rs-cvhead">Education</h2>
{% for e in site.data.cv.education %}{% include rs-cvrow.html item=e %}{% endfor %}

<h2 class="rs-cvhead">Experience</h2>
{% for e in site.data.cv.experience %}{% include rs-cvrow.html item=e %}{% endfor %}

<p class="rs-cv__download" style="margin-top:2rem"><a class="rs-btn" href="{{ base_path }}/files/Rudi_Smith_CV.pdf"><i class="fas fa-file-pdf" aria-hidden="true"></i> My full CV (PDF)</a></p>
</div>
