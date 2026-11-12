---
title: "Randomized Tucker-sketched GMRES"
collection: publications
category: preprints
permalink: /publication/tucker-sketched-gmres
date: 2026-08-15
venue: 'arXiv:2608.11091'
status: 'Preprint'
arxiv_id: 'arXiv:2608.11091'
authors: 'Alberto Bucci, Martina Iannacito, Mirjeta Pasha and <span class="rs-me">Rudi Smith</span>'
summary: 'GMRES for linear systems whose unknowns are tensors in Tucker format. Sketching with short recurrences replaces full Arnoldi orthogonalization, which keeps the ranks of the Krylov basis under control. The low-rank constraint also acts as a regularizer for image deblurring.'
thumb: gmres
has_demo: true
code: 'https://doi.org/10.5281/zenodo.19074856'
demo: /publication/tucker-sketched-gmres#demo
arxiv: 'https://arxiv.org/abs/2608.11091'
citation: 'A. Bucci, M. Iannacito, M. Pasha and R. Smith. Randomized Tucker-sketched GMRES. arXiv:2608.11091, 2026.'
cv_authors: 'A. Bucci, M. Iannacito, M. Pasha, and <span class="rs-me">R. Smith</span>'
cv_status: 'Preprint.'
excerpt: 'Sketched GMRES variants with short recurrences for tensor-structured linear systems in Tucker format.'  # used for link previews and search results
---
{% include base_path %}
For large linear systems whose solution is a tensor in Tucker format, standard GMRES runs into a familiar problem: every new Krylov basis vector has higher rank than the last, so tensor operations become more expensive and memory use grows with each iteration. Every new Krylov vector is a sum of earlier ones, the same rank growth seen in [summing Tucker tensors](/publication/tucker-summation), and full Arnoldi orthogonalization makes these sums longer at every step.

This paper replaces full orthogonalization with **sketched GMRES using short recurrences** and gives two ways of keeping the basis compressed:

- **RHOSVD-Tucker sGMRES** recompresses with a randomized higher-order SVD and chooses the rank at each iteration dynamically.
- **MLN-Tucker sGMRES** uses a fixed-rank multilinear Nyström approximation, which allows streaming and memory-efficient reconstruction of the solution.

## Try it {#demo}

This demo runs the paper's **RHOSVD-Tucker sGMRES** against **RHOSVD-Tucker GMRES**, the same solver with full orthogonalization, on the convection–diffusion problem:

$$\mathcal{L} = L_1 \otimes I \otimes I + I \otimes L_1 \otimes I + I \otimes I \otimes L_1, \qquad L_1 = \kappa\Delta_1 + \omega\nabla_1,$$

with $$\kappa = 10^{-2}$$, $$\omega = 5\times10^{-2}$$, an upwind $$\nabla_1$$, and the rank-one right-hand side $$\mathcal{B} = a_1 \otimes b_1 \otimes c_1$$ ($$a_1$$ the normalized all-ones vector, $$b_1 = c_1 = e_1$$). The grid is $$24^3$$ here so very small.

Everything stays in Tucker format, as in the paper:

- **RoundSum:** applying $$\mathcal{L}$$ produces a sum of Tucker tensors, which is recompressed with a randomized RoundSum (Khatri–Rao Gaussian sketches through MTTKRP, QR, then an ST-HOSVD of the small core).
- **Short recurrence:** sGMRES orthogonalizes each new basis tensor against only the last $$k_{\text{trunc}}$$ basis tensors.
- **Sketched least squares:** sGMRES solves its least-squares problem after the Khatri–Rao sketch $$S = \odot_k S_k$$ and stops once the sketched residual drops below $$\eta \cdot \text{tol}$$ with $$\eta = 0.3$$.

Try $$k_{\text{trunc}} = 1$$: the sketched residual keeps falling while the true residual stagnates. With $$k_{\text{trunc}} \ge 2$$ the method converges.

<div class="rs-demo" data-demo="gmres" markdown="0">
  <div class="rs-controls">
    <label>Tolerance <select name="tol"><option value="1e-3">10⁻³</option><option value="1e-4" selected>10⁻⁴</option></select></label>
    <label>\(k_{\text{trunc}}\) <select name="k"><option value="1">1</option><option value="2" selected>2</option><option value="3">3</option></select></label>
    <button type="button" class="rs-btn" data-run>Run again</button>
    <span>Iterations (sGMRES / GMRES): <strong data-it>0</strong></span>
  </div>
  <div class="rs-panels rs-panels--wide">
    <div class="rs-panel">
      <h4>Residual each method monitors</h4>
      <div class="rs-chart"><canvas aria-label="Residual against iteration for Tucker sGMRES (sketched residual) and Tucker GMRES"></canvas></div>
      <p class="rs-note">For sGMRES this is the sketched residual \(\lVert M y - b_s \rVert / \lVert b_s \rVert\). For GMRES it is the Arnoldi residual. The true residuals are compared at the end.</p>
    </div>
    <div class="rs-panel">
      <h4>Solution slice \(\mathcal{X}(:, :, 2)\)</h4>
      <canvas class="rs-square" data-slice aria-label="A slice of the sGMRES solution, updated every five iterations"></canvas>
      <p class="rs-note">Formed from the Tucker basis every five iterations by RoundSum.</p>
    </div>
  </div>
  <div class="rs-panel" style="margin-top:1.25rem">
    <h4>Cumulative compute time in your browser</h4>
    <div class="rs-chart rs-chart--short"><canvas aria-label="Cumulative compute time against iteration for both methods"></canvas></div>
    <p class="rs-note">Full orthogonalization works with every earlier basis tensor, so each GMRES step costs more than the last. sGMRES uses only \(k_{\text{trunc}}\) of them, so its cost grows much more slowly.</p>
  </div>
  <p class="rs-summary" data-summary></p>
</div>

The demo is a JavaScript re-implementation of the algorithms, written for this site. There are parameter choices made for the sake of demonstration. The MLN-Tucker variant is not included in the demo. For full experiments please refer to the paper.

## Results

We saw in our experiments that both methods outperformed standard low-rank Tucker solvers on symmetric and nonsymmetric 3D test problems. Of note is that for image deblurring problems, the low-rank Tucker constraint acted as an implicit regularizer. Combined with adaptive projected Tikhonov regularization and generalized cross-validation for the parameter choice, it gave stable image reconstructions.

## Code and data

The code, data and results for the paper's numerical experiments are on [Zenodo](https://doi.org/10.5281/zenodo.19074856). The full methods and experiments are in the [paper on arXiv](https://arxiv.org/abs/2608.11091).

<script type="module" src="{{ base_path }}/assets/js/demos/gmres-demo.js"></script>
