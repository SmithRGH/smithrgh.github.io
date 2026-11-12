---
title: "Efficient sketching-based summation of Tucker tensors"
collection: publications
category: journal
permalink: /publication/tucker-summation
date: 2026-03-13
venue: 'SIAM Journal on Scientific Computing'
status: 'Accepted to SIAM Journal on Scientific Computing'
arxiv_id: 'arXiv:2603.13532'
doi: '10.48550/arXiv.2603.13532'  # the arXiv DOI; change to the journal DOI once published
authors: '<span class="rs-me">Rudi Smith</span>, Mirjeta Pasha, Andrés Galindo-Olarte, Hussam Al Daas, Grey Ballard, Joseph Nakao, Jing-Mei Qiu and William Taitano'
summary: 'Adding tensors in Tucker format makes the ranks pile up, and standard rounding has to form a large dense core that may not fit in memory. Randomized sketches using Kronecker and Khatri–Rao structure work on the factors directly and never build that core.'
thumb: tucker
has_demo: true
code: 'https://doi.org/10.5281/zenodo.21753807'
demo: /publication/tucker-summation#demo
arxiv: 'https://arxiv.org/abs/2603.13532'
citation: 'R. Smith, M. Pasha, A. Galindo-Olarte, H. Al Daas, G. Ballard, J. Nakao, J.-M. Qiu and W. Taitano. Efficient sketching-based summation of Tucker tensors. SIAM Journal on Scientific Computing (accepted), 2026. arXiv:2603.13532.'
cv_authors: '<span class="rs-me">R. Smith</span>, M. Pasha, A. Galindo-Olarte, H. Al Daas, G. Ballard, J. Nakao, J.-M. Qiu, and W. Taitano'
cv_status: 'Accepted to SIAM Journal on Scientific Computing (SISC).'
excerpt: 'Structured randomized sketching for recompressing sums of Tucker tensors without forming the large intermediate core.'  # used for link previews and search results
bibtex: |  # shown by the BibTeX button on the Publications page
  @MISC{SmiPGetal26,
    author        = {Smith, R. and Pasha, M. and Galindo-Olarte, A. and Al~Daas, H. and Ballard, G. and Nakao, J. and Qiu, J.-M. and Taitano, W.},
    title         = {Efficient sketching-based summation of {T}ucker tensors},
    note          = {Accepted to SIAM Journal on Scientific Computing},
    month         = mar,
    year          = {2026},
    eprint        = {2603.13532},
    archivePrefix = {arXiv},
    doi           = {10.48550/arXiv.2603.13532}
  }
---
{% include base_path %}
Many solvers for high-dimensional problems keep their iterates as tensors in Tucker format and repeatedly add them together. Each sum increases the multilinear ranks, so the result has to be recompressed. The standard approach first forms the block-diagonal core of the sum, which grows like $$(sr)^3$$ for $$s$$ terms of rank $$r$$ and can become larger than the memory available. This paper develops randomized sketching algorithms that exploit the Kronecker and Khatri–Rao structure of the sketches. They operate directly on the factor matrices and small cores of the individual terms, and use an effective-rank estimate to heuristically choose the sketch sizes. 

## Why sums of Tucker tensors are expensive

A Tucker tensor stores an $$n \times n \times n$$ array as a small core $$G$$ multiplied by a factor matrix in each direction. Adding $$s$$ of them is easy on paper: you concatenate the factors and place the cores on the diagonal of a bigger core. The catch is that this core has $$(sr)^3$$ entries and quickly becomes larger than the tensor it represents. Recompressing it the usual way means forming it first. The sketch-based approach multiplies each unfolding by a structured random matrix, $$X_{(1)}(\Omega_3 \odot \Omega_2)$$, which splits into small products with the individual factors and cores. The big core is never formed.

## Try it {#demo}

The demo works with tensors of size $$48 \times 48 \times 48$$. Each term is a Tucker tensor $$\mathcal{X}_j = \mathcal{G}_j \times_1 U_1^{(j)} \times_2 U_2^{(j)} \times_3 U_3^{(j)}$$ with multilinear rank $$(3,3,3)$$:

- **Factors.** Each $$U_k^{(j)}$$ has three columns: a Gaussian bump $$g(t) = e^{-t^2/2}$$ centred at a point $$c_k$$, and the next two Hermite-type functions $$t\,g(t)$$ and $$\tfrac12(t^2-1)\,g(t)$$, with $$t = (x - c_k)/w$$. The width $$w$$ is random, between $$0.06$$ and $$0.13$$.
- **Core.** $$\mathcal{G}_j$$ is a random $$3 \times 3 \times 3$$ core. Its leading entry is $$\pm(1.2\text{ to }2.2)$$, so each term is mostly a positive or negative blob, and the other entries are small Gaussian perturbations that give the blob some internal structure.

Clicking the left picture adds one such term, centred where you click, at a random depth. The demo starts with eight terms, and the button adds six at random positions. The sum $$\mathcal{C} = \sum_{j=1}^{s} \mathcal{X}_j$$ is again a Tucker tensor. Its factor matrices are the concatenations $$[U_k^{(1)}, \dots, U_k^{(s)}]$$, and its core is block diagonal with the $$\mathcal{G}_j$$ on the diagonal, so it has formal rank $$3s$$ in each mode and $$(3s)^3$$ entries. Once $$3s$$ passes $$48$$, which takes 16 terms, that core is bigger than the tensor itself.

**How the sketch recompresses it.**

1. For each mode $$k$$, draw Gaussian matrices $$\Omega_\ell$$ for the other two modes, each with $$\ell = \min(3s, 48) + 10$$ columns.
2. Sketch the mode-$$k$$ unfolding through the Khatri–Rao product, term by term:
   $$Y_k = \sum_{j} U_k^{(j)}\, \mathcal{G}_{j,(k)} \big( (U_{\ell_2}^{(j)\mathsf T}\Omega_{\ell_2}) \odot (U_{\ell_1}^{(j)\mathsf T}\Omega_{\ell_1}) \big).$$
   Each term only touches its own $$48 \times 3$$ factors and $$3 \times 3 \times 3$$ core, so the block-diagonal core is never formed.
3. Compute the singular values $$\sigma_1 \ge \sigma_2 \ge \cdots$$ of each sketch $$Y_k$$. Keep the directions with $$\sigma_i > \text{tol} \cdot \sigma_1$$. Their number is that mode's rank, and the corresponding left singular vectors form an orthonormal basis $$Q_k$$.
4. Project the core onto these bases, $$\widetilde{\mathcal{G}} = \sum_j \mathcal{G}_j \times_k (Q_k^{\mathsf T} U_k^{(j)})$$. This only multiplies small matrices. The panels show one slice of the exact sum and of the recompressed tensor, with the relative error measured against the full $$48^3$$ sum. Lower the tolerance and the ranks grow while the error falls.

<div class="rs-demo" data-demo="tucker" markdown="0">
  <div class="rs-controls">
    <button type="button" class="rs-btn" data-add>Add six at random</button>
    <button type="button" class="rs-btn" data-clear>Clear</button>
    <label>Tolerance <select name="tol"><option value="1e-2">10⁻²</option><option value="1e-4" selected>10⁻⁴</option><option value="1e-6">10⁻⁶</option></select></label>
    <label>Slice depth <input type="range" name="k" min="0" max="47" value="24"></label>
  </div>
  <div class="rs-panels rs-panels--2">
    <div class="rs-panel">
      <h4>Exact sum (one slice)</h4>
      <canvas class="rs-square is-clickable" data-slice tabindex="0" aria-label="Slice of the summed tensor. Click to add a tensor at that position; press Enter to add one at random."></canvas>
    </div>
    <div class="rs-panel">
      <h4>Recompressed by sketching</h4>
      <canvas class="rs-square" data-slice aria-label="The same slice after sketch-based recompression"></canvas>
    </div>
  </div>
  <div class="rs-panels rs-panels--2" style="margin-top:1.25rem">
    <dl class="rs-stats">
      <dt>Tensors summed</dt><dd data-terms>0</dd>
      <dt>Formal core</dt><dd data-formal>0</dd>
      <dt>Sketched core</dt><dd data-sketched>0</dd>
      <dt>Full tensor</dt><dd data-full>0</dd>
      <dt>Relative error</dt><dd data-err>0</dd>
    </dl>
    <canvas class="rs-core" data-core aria-label="Size of the formal block-diagonal core compared with the recompressed core"></canvas>
  </div>
</div>

This is a simplified JavaScript version written for this site. It uses the paper's key idea, sketching through Khatri–Rao structure without forming the big core, but chooses ranks much more simply. It applies a relative cut-off to each mode's sketch singular values and uses a fixed sketch size of $$3s + 10$$. The paper instead picks the sketch size from an effective-rank estimate and truncates the small core with ST-HOSVD to a guaranteed error tolerance. For in depth experiments and code please refer to the paper.

## Code and data

The MATLAB code, data and results for the paper's experiments are on [Zenodo](https://doi.org/10.5281/zenodo.21753807). The algorithms, analysis and full experiments are in the [paper on arXiv](https://arxiv.org/abs/2603.13532).

<script type="module" src="{{ base_path }}/assets/js/demos/tucker-demo.js"></script>
