---
title: "Attention mechanisms through the lens of numerical methods: approximation methods and alternative formulations"
collection: publications
category: submitted
permalink: /publication/attention-numerical-methods
date: 2026-04-02
venue: 'arXiv:2604.01757'
status: 'Submitted'
arxiv_id: 'arXiv:2604.01757'
authors: 'Michel Fabrice Serret, Alice Cortinovis, Yijun Dong, Diana Halikias, Anna Ma, Fabio Matti, Deanna Needell, Katherine J. Pearce, Elizaveta Rebrova, Disha Shur, <span class="rs-me">Rudi Smith</span>, Hai-Xiao Wang and Laura Grigori'
summary: 'A survey of fast approximations to transformer attention, sorted by the numerical idea behind them: sparsity and clustering, low-rank projection, randomized sketching and tensor decompositions, together with kernel reformulations and variants such as latent attention.'
thumb: attention
has_demo: false
demo: /publication/attention-numerical-methods
arxiv: 'https://arxiv.org/abs/2604.01757'
citation: 'M. F. Serret, A. Cortinovis, Y. Dong, D. Halikias, A. Ma, F. Matti, D. Needell, K. J. Pearce, E. Rebrova, D. Shur, R. Smith, H.-X. Wang and L. Grigori. Attention mechanisms through the lens of numerical methods: Approximation methods and alternative formulations. arXiv:2604.01757, 2026.'
cv_authors: 'M. F. Serret, A. Cortinovis, Y. Dong, D. Halikias, A. Ma, F. Matti, D. Needell, K. J. Pearce, E. Rebrova, D. Shur, <span class="rs-me">R. Smith</span>, H.-X. Wang, and L. Grigori'
cv_status: 'Submitted.'
excerpt: 'A numerical-analysis survey of fast attention approximations and alternative formulations.'  # used for link previews and search results
---
{% include base_path %}
The attention mechanism in transformers forms an $$n \times n$$ matrix $$\operatorname{softmax}(QK^{\mathsf{T}}/\sqrt{d})$$, so its cost grows quadratically with sequence length. This is a central bottleneck for long-context inference. The survey classifies existing fast attention methods by the numerical principle they rely on:

- **Sparsity and clustering:** keep only the entries of the attention matrix that matter, for example those near the diagonal or within a cluster of similar tokens.
- **Low-rank projections:** approximate the attention matrix through a few landmark tokens or a projected subspace.
- **Randomized sketching:** approximate the softmax kernel with random features or sketches.
- **Tensor decompositions:** represent parts of the attention computation in compressed tensor formats.

It also covers kernel-based reformulations and variants such as latent attention. Putting these methods in one mathematical framework is meant to connect the machine-learning and numerical-analysis communities, and to point out where numerical linear algebra could contribute to scalable attention.

{% comment %}
  Figure from the paper. To show it, upload the compiled figure as
  images/attention-figure.svg, then delete the comment tags around the figure below.
{% endcomment %}
{% comment %}
<figure class="rs-paperfig" markdown="0">
  <img src="{{ base_path }}/images/attention-figure.svg" alt="Diagram of the attention mechanism, from the paper">
  <figcaption>The attention mechanism, from Serret et al. (2026), arXiv:2604.01757.</figcaption>
</figure>
{% endcomment %}

[Read the paper on arXiv](https://arxiv.org/abs/2604.01757).
