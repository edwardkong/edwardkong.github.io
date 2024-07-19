---
layout: post
title: "Benchmarking My Chess Engine in CPython vs PyPy"
lead: "Analyzing computationally intensive applications in CPython vs PyPy"
---

In a [previous post](/_site/2024/01/22/chess-engine/index.html), I introduced my pure Python chess engine. This engine, developed without external libraries, handles board representation, legal move generation, and evaluation. Upon receiving a move, the engine calculates the best move by evaluating all potential responses. Due to chess's complexity, this requires exploring wide move branches several layers deep, making execution speed and optimization critical to performance.

Python, while versatile, is often considered "slow", especially for computationally intensive tasks. Its most common implementation, CPython, interprets code on the fly, which can be inefficient for applications repeatedly executing the same functions millions of times. PyPy, a drop-in replacement for CPython that introduces a JIT compiler, aims to improve on that limitation by optimizing for frequently resused code.

To quantify these potential improvements, I benchmarked the same chess game 5 times each with CPython and PyPy. This post dives into the results of that comparison, offering insights not just for chess engine optimization, but for Python developers working on performance-critical projects.

## Methodology

To perform this analysis, I set up a controlled environment using VMware Fusion with the following specs. 

```
Host System: Intel Core i9-9980HK CPU @ 2.40 GHz
Operating System: Ubuntu 24.04 LTS
Processors: 2 CPU Cores
Memory: 4096 MB
```

The engine was measured using cProfile on a single thread, focusing on pure computational speed without involving parallel processing. For this benchmark, I used the latest stable version of PyPy and its latest compatible CPython version:

### CPython
```
Python 3.9.19
```
### PyPy
```
Python 3.9.19
 [PyPy 7.3.16 with GCC 10.2.1]
```

## Findings

### Total Execution Time

Overall, PyPy ran on average **2.90x** faster than CPython for the same workload. Both implementations executed 3,464,032,732 primitive function calls in the following time:

![pic](/assets/files/chess-benchmark/tet.png)

To understand the most significant performance gains, I analyzed the functions where my engine spent the most time. Across the 10 functions with the highest total runtime, PyPy was **3.51x** faster than CPython.

![Top 10 TET Graph](/assets/files/chess-benchmark/top10tet.png)

One function that improved dramatically with PyPy was `bitscan_lsb`, which returns the least significant bit of a binary integer:

```python
def bitscan_lsb(bin):
    return (bin & -bin).bit_length() - 1
```

This function alone saw a **9.42x** speedup with PyPy, highlighting PyPy's strength in optimizing simple, frequently executed code through its JIT compilation.


Conversely, for 10 functions with the least execution time (>0.001 seconds), PyPy was only **2.04x** faster than CPython. The speedups diminished as total runtime decreased, with CPython outperforming PyPy for shorter-running functions. This illustrates PyPy's initial overhead, which is offset by optimization benefits in longer-running and frequently called functions.

![Bottom 10 TET Graph](/assets/files/chess-benchmark/bottom10.png)

To measure this relationship, I plotted the relative difference 

\[
\frac{CPython_{time} - PyPy_{time}}{CPython_{time} + PyPy_{time}}
\]

<script>
  window.MathJax = {
    tex: {
      inlineMath: [['$', '$'], ['\\(', '\\)']]
    },
    svg: {
      fontCache: 'global'
    }
  };
</script>
<script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
<script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>


against function call frequency and total function runtime on a logarithmic scale, where positive y-value represents a faster PyPy execution, while negative y-value represents a faster CPython execution.


![RPD vs FCF Graph](/assets/files/chess-benchmark/rpfnfc.png)

![RPD vs TFR Graph](/assets/files/chess-benchmark/rpdtfr.png)

## Conclusion

While PyPy clearly provided significant gains in performance in the context of my chess engine, the optimization is not necessarily linear nor guaranteed. PyPy's JIT compiler excels at significantly speeding up performance when it comes to:

- Long-running applications
- Computational tasks
- Loop-heavy or deep recursive call stacks

Luckily, these advantages suit the needs of a chess engine perfectly, and I was able to demonstrate a 2.90x speedup by switching from CPython to PyPy. Not every function was sped up, though, so I encourage developers who are looking to adopt PyPy for their applications to perform a benchmark of their own and evaluate the results.

For those interested in exploring further, the code for my [chess engine](https://github.com/edwardkong/Dex/) and the full [benchmark analysis](https://github.com/edwardkong/Dex/blob/main/benchmark/benchmark.ipynb) is available on my [github](https://github.com/edwardkong/).