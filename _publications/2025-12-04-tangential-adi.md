---
title: "A tangential low-rank ADI method for solving indefinite Lyapunov equations"
collection: publications
category: submitted
permalink: /publication/tangential-adi
date: 2025-12-04
venue: 'arXiv:2512.04983'
status: 'Submitted'
arxiv_id: 'arXiv:2512.04983'
doi: '10.48550/arXiv.2512.04983'  # the arXiv DOI; change to the journal DOI once published
authors: '<span class="rs-me">Rudi Smith</span> and Steffen W. R. Werner'
summary: 'Large Lyapunov equations whose constant term has high rank and an indefinite middle factor. Instead of solving with every column at every step, the method solves with one well-chosen direction, so the stored solution factor has some rank control.'
thumb: adi
has_demo: true
code: 'https://doi.org/10.5281/zenodo.19582087'
demo: /publication/tangential-adi#demo
arxiv: 'https://arxiv.org/abs/2512.04983'
citation: 'R. Smith and S. W. R. Werner. A tangential low-rank ADI method for solving indefinite Lyapunov equations. arXiv:2512.04983, 2025.'
cv_authors: '<span class="rs-me">R. Smith</span> and S. W. R. Werner'
cv_status: 'Submitted.'
excerpt: 'Low-rank ADI that updates one tangential direction per step for Lyapunov equations with an indefinite, high-rank constant term.'  # used for link previews and search results
bibtex: |  # shown by the BibTeX button on the Publications page
  @MISC{SmiW25,
    author        = {Smith, R. and Werner, S.~W.~R.},
    title         = {A tangential low-rank {ADI} method for solving indefinite {L}yapunov equations},
    month         = dec,
    year          = {2025},
    eprint        = {2512.04983},
    archivePrefix = {arXiv},
    doi           = {10.48550/arXiv.2512.04983}
  }
---
{% include base_path %}
Lyapunov equations $$AX + XA^{\mathsf H} + BRB^{\mathsf H} = 0$$ show up throughout model order reduction and control. When $$A$$ is large and sparse, the solution is stored in low-rank form $$X \approx LDL^{\mathsf H}$$, and the alternating direction implicit (ADI) method builds the factor $$L$$ step by step.

This paper treats the case where the constant term $$BRB^{\mathsf H}$$ has **high rank** and the middle matrix $$R$$ is **indefinite**. Classical block ADI then solves a linear system with every column of $$B$$ at every step, so $$L$$ grows by many columns per iteration. The tangential method instead compresses each update to a single column, using directions taken from the eigenvectors of $$R$$, and chooses the shifts and directions dynamically as it goes.

In the numerical experiments, the tangential method reaches the same residual as block ADI with smaller solution factors.

## How the tangential step works

The method keeps the residual in factored form, $$W_j R W_j^{\mathsf H}$$, starting from $$W_0 = B$$. Block ADI solves the shifted system $$(A + \alpha_j I)V_j = W_{j-1}$$ with all $$m$$ columns of $$W_{j-1}$$ at once, so $$L$$ grows by $$m$$ columns per step. The tangential step solves with a single direction instead. With $$R = TST^{\mathsf H}$$, pick an eigenvector $$t_j$$ (eigenvalue $$s_p$$), then

$$\begin{aligned} (A + \alpha_j I)\, v_j &= W_{j-1} t_j, & W_j &= W_{j-1} - 2\,\mathrm{Re}(\alpha_j)\, v_j t_j^{\mathsf H}, \\ L_j &= [L_{j-1},\ v_j], & d_j &= -2\,\mathrm{Re}(\alpha_j)\, s_p. \end{aligned}$$

Each step adds one column to $$L$$ and one diagonal entry to $$D$$. The direction is chosen where it helps most, for example the eigenvector that maximizes $$\lVert W_{j-1} t \rVert_2$$, so effort goes to whichever part of the residual is largest.

## Try it {#demo}

The demo solves $$AX + XA^{\mathsf T} + BRB^{\mathsf T} = 0$$ for a $$260 \times 260$$ matrix $$X$$, built as follows.

- **The operator $$A$$** is the central finite-difference discretization of $$u'' - c\,u'$$ on $$[0,1]$$, with 260 interior grid points, zero boundary values and flow $$c = 60$$. It is tridiagonal and nonsymmetric, with real negative eigenvalues, so the equation is stable.
- **The columns of $$B$$** are smooth Gaussian bumps $$b_j(x) = a_j \exp\!\big(-(x - c_j)^2 / 2w_j^2\big)$$, spread across the interval. Each has a random centre $$c_j$$, width $$w_j \in [0.02, 0.07]$$ and amplitude $$a_j \in [0.6, 1.6]$$.
- **The matrix $$R$$** is symmetric and indefinite. Its diagonal alternates in sign, $$+(1 + \tfrac12 z^2)$$ and $$-1.3\,(1 + \tfrac12 z^2)$$ with $$z$$ a standard normal draw. A coupling of $$0.4$$ between some neighbouring pairs of columns makes it non-diagonal, so its eigenvectors mix columns of $$B$$ and the choice of tangential direction matters.

Both methods use the same 12 real shifts, log-spaced across the spectrum of $$A$$, and stop once the relative residual $$\lVert W_j R W_j^{\mathsf T}\rVert_F / \lVert BRB^{\mathsf T}\rVert_F$$ falls below $$10^{-8}$$. Each step, block ADI solves with all $$m$$ columns and adds $$m$$ columns to $$L$$. The tangential method solves with the single direction $$W_{j-1}t_j$$ and adds one column. Increase $$m$$ to see the gap widen, or draw a new random $$B$$ and $$R$$.

<div class="rs-demo" data-demo="adi" markdown="0">
  <div class="rs-controls">
    <label>Columns in \(B\) <input type="range" name="m" min="1" max="14" step="1" value="8"> <output data-m>8</output></label>
    <button type="button" class="rs-btn" data-new>New random \(B\) and \(R\)</button>
  </div>
  <div class="rs-panels rs-panels--wide">
    <div class="rs-panel">
      <h4>Residual against storage</h4>
      <div class="rs-chart"><canvas aria-label="Relative residual against the number of columns of L for block and tangential ADI"></canvas></div>
    </div>
    <div class="rs-panel">
      <h4>The solution \(X\)</h4>
      <canvas class="rs-square" data-x aria-label="Heatmap of the computed solution X"></canvas>
      <p class="rs-note">Red is positive and blue is negative. Because \(R\) is indefinite, so is \(X\).</p>
    </div>
  </div>
  <div class="rs-panel" style="margin-top:1.25rem">
    <h4>Which direction the tangential method picked at each step</h4>
    <canvas class="rs-strip" data-strip aria-label="One mark per step showing which eigenvector of R was used"></canvas>
    <p class="rs-note">Each row is an eigenvector of \(R\) and each mark is one step. Red rows belong to positive eigenvalues and blue rows to negative ones. The method moves back and forth between the two, putting effort wherever the residual is largest.</p>
  </div>
  <p class="rs-summary" data-summary></p>
</div>

This is a simplified JavaScript version written for this site only. It follows the update formulas above and the residual-based direction rule. The main difference from the paper is the shifts: it cycles through a fixed log-spaced set instead of choosing them adaptively by projection. For full experiments and code please refer to the paper.

## Code and data

The MATLAB code, data and results for the paper's experiments are on [Zenodo](https://doi.org/10.5281/zenodo.19582087). The full method, its analysis and the experiments are in the [paper on arXiv](https://arxiv.org/abs/2512.04983).

<script type="module" src="{{ base_path }}/assets/js/demos/adi-demo.js"></script>
