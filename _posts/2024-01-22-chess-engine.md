---
layout: post
title: "Building a Chess Engine in Python"
lead: "How I developed a chess engine in pure Python: techniques, algorithms, and limitations"
---

As a chess enthusiast and programmer, my fascination with the technical challenges of building a chess engine inspired me to develop my own.

For this project, I decided to use Python, mainly for its speed of development. As I'd soon discover, this decision ultimately limited the performance potential of my engine.

Understanding the engine's limitations begins with chess's inherent complexity. Unlike humans, who intuitively narrow down promising moves, computers must evaluate all possible moves, as even seemingly frivolous moves can ultimately be pivotal.

Thus, the basis of chess engines is evaluating every legal position that can arise from our current game state. To find all of those positions, we must identify all of our legal moves, all of our opponent's responses to each move, all of our responses to their moves, their responses to ours, and so on and so forth. As you can begin to understand, the complexity of the game tree starts to branch out exponentially. This factor is what's known as the branching factor.

Below, we can see how rapidly the number of possible positions increases.

<table class="table">
  <thead>
    <tr>
      <th>Number of plies (half-moves)</th>
      <th>Number of possible positions</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>1</td>
      <td>20</td>
    </tr>
    <tr>
      <td>2</td>
      <td>400</td>
    </tr>
    <tr>
      <td>3</td>
      <td>8,902</td>
    </tr>
    <tr>
      <td>4</td>
      <td>197,281</td>
    </tr>
    <tr>
      <td>5</td>
      <td>4,865,609</td>
    </tr>
    <tr>
      <td>6</td>
      <td>119,060,324</td>
    </tr>
    <tr>
      <td>7</td>
      <td>3,195,901,860</td>
    </tr>
    <tr>
      <td>8</td>
      <td>84,998,978,956</td>
    </tr>
    <tr>
      <td>9</td>
      <td>2,439,530,234,167</td>
    </tr>
    <tr>
      <td>10</td>
      <td>69,352,859,712,417</td>
    </tr>
    <tr>
      <td>11</td>
      <td>2,097,651,003,696,806</td>
    </tr>
    <tr>
      <td>12</td>
      <td>62,854,969,236,701,747</td>
    </tr>
    <tr>
      <td>13</td>
      <td>1,981,066,775,000,396,239</td>
    </tr>
    <tr>
      <td>14</td>
      <td>61,885,021,521,585,529,237</td>
    </tr>
    <tr>
      <td>15</td>
      <td>2,015,099,950,053,364,471,960</td>
    </tr>
  </tbody>
</table>

With an average game length of 80 plies and an average branching factor of 35, [Shannon's Number](https://en.wikipedia.org/wiki/Shannon_number) gives us a lower bound of 10^120 possible games of chess. For context,
physicists estimate the number of atoms in the known universe to be *only* 10^80. When working with magnitudes of this order, even slight optimizations can lead to significant speed-ups.

## Bitboards

[Bitboards](https://www.chessprogramming.org/Bitboards), a foundational chess engine component, efficiently represent piece positions using 64-bit integers. Bitboards offer several advantages, including:
- **Efficient**: Operations on bitboards are carried out using bitwise operations, which can be processed in a single instruction on 64-bit processors. More complex operations can also be simplified using bitmasks.
- **Fast**: Bitwise operations enable quick evaluations and updates of the board state, essential for move generation and evaluation.
- **Compact**: Bitboards have a high information density which reduces memory overhead and improves cache utilization.


<figure>
  <img src="/assets/files/chess-engine/bitboards.jpeg" style="display: block; margin: 0 auto;">
  <figcaption style="text-align: center; font-size: 12px;"><i>12 bitboards represent the occupancy boards for each piece-type and color.</i></figcaption>
</figure>

<figure>
  <img src="/assets/files/chess-engine/bitboard-bits.jpeg" style="display: block; margin: 0 auto;">
  <figcaption style="text-align: center; font-size: 12px;"><i>The board is represented in 64 bits, with a set bit implying the existence of a piece of the particular piece-type and color on the corresponding square.</i></figcaption>
</figure>


This technique allows for rapid and efficient evaluation of potential moves and game states, providing an inexpensive foundation for the engine’s wide and deep decision-making processes.

## Evaluation

With the board efficiently represented, a crucial aspect of a chess engine lies in its ability to evaluate different board positions.

### Basic Material Evaluation

At the most basic level, evaluation can be performed by counting the material each side has and summing point values assigned to each type of piece.

The code snippet below aggregates the total piece score on the board for one side. The piece values were derived from commonly established [point values](https://www.chessprogramming.org/Point_Value) and adjusted based on performance.

``` python
PIECE_VALUES = {
  0: 101, # Pawn
  1: 316, # Knight
  2: 329, # Bishop
  3: 494, # Rook
  4: 903  # Queen
}

for piece_type in range(5):
    num_pieces = gamestate.board.bitboards[piece_type].bit_count()
    evaluation += num_pieces * PIECE_VALUES[piece_type]
```

### Piece-Square Tables

Building upon this, we can adjust the score of a piece by adding a positive or negative offset based on the piece's location. General rules can be applied to guide the engine toward better decisions. For instance, pieces are generally more effective when centralized, where they control more squares, rather than being on the edge of the board. For pawns, it is preferable for them to be closer to the opposite end of the board, where they can promote to a queen. These values can be assigned through a [piece-square table](https://www.chessprogramming.org/Piece-Square_Tables).

Below is an example of how our scoring function changes to include a Knight's piece-square table.

```python
KNIGHT_TABLE = [
    -50,-30,-30,-30,-30,-30,-30,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-30,-30,-30,-30,-30,-30,-50
]

pieces = board.bitboards[piece_type]
while pieces:
    square = bitscan_lsb(pieces)
    evaluation += PIECE_VALUES[piece_type] + KNIGHT_TABLE[square]
    pieces &= pieces - 1
```

We scan for the least significant bit in the bitboard `pieces` to find the locations of each piece, add the corresponding offset defined in `KNIGHT_TABLE` to the evaluation, and flip that bit to 0. Once we have evaluated each piece of that type, `pieces` will contain `0`, as all set bits in `pieces` have been unset.

### Advanced Evaluation Features

Of course, this hardly scratches the surface of the complexity of evaluating chess positions. There are many more less obvious [features](https://www.chessprogramming.org/Evaluation) that influence evaluation including pawn structure, king safety, space, and mobility. In fact, some are so abstract that even the most advanced engines sometimes fail to recognize patterns. If you're interested, [read more](https://www.chess.com/article/view/10-positions-chess-engines-just-dont-understand) about them and see if you can figure them out yourself.

## Search Algorithms

With the game state efficiently represented by bitboards and a robust evaluation function in place, the next critical task is to explore possible outcomes using search algorithms. For this, I employ the alpha-beta [minimax algorithm](https://www.chessprogramming.org/Minimax), a commonly used algorithm in chess engines and other game theory programs.

The minimax algorithm forecasts future game states by exploring all potential move up to a specified depth, assigning evaluations to each resultant position. The best move at each depth is then propagated upwards to then identify the best move at the starting position.

### Minimax Search

<figure>
  <img src="/assets/files/chess-engine/minimax.gif" style="display: block; margin: 0 auto;">
  <figcaption style="text-align: center; font-size: 12px;"><i>Minimax Algorithm finding the best move at 3 plies deep.</i></figcaption>
</figure>

In practice, the engine starts with a few possible moves and expands each option, evaluating the consequences under the assumption that both players will play optimally. Once all options are explored at the current depth, the moves with the optimal outcomes for the moving player are selected, leading to a decision tree that guides the actual best move.

### Alpha-beta Pruning

To enhance the efficiency of the minimax algorithm, I incorporate [alpha-beta pruning](https://en.wikipedia.org/wiki/Alpha%E2%80%93beta_pruning), which significantly reduces the number of evaluated positions by cutting off branches that cannot possibly affect the final decision.

<figure>
  <img src="/assets/files/chess-engine/minimax-ab.gif" style="display: block; margin: 0 auto;">
  <figcaption style="text-align: center; font-size: 12px;"><i>Minimax Algorithm with alpha-beta pruning.˚v</i></figcaption>
</figure>

This optimization works by maintaining two values, alpha and beta, which represent the minimum score that the maximizing player is assured of and the maximum score that the minimizing player is assuring, respectively. If the evaluation of a move is outside these bounds, further exploration of that move can be safely pruned. If a candidate move leads to a score worse than a previously examined move, it is abandoned, as it cannot result in a better outcome. In this example, the third move allows the minimizer to guarantee an evaluation of -2 at best. Because the second move already guarantees a best move with an evaluation of +1, the remainder of the third move branch can be pruned.

Alpha-beta pruning can lead to significant performance enhancements, and even more so if the moves are [ordered](https://www.chessprogramming.org/Move_Ordering) to encourage more pruning.

Below is my implementation of the alpha-beta minimax algorithm.

```python
def minimax_ab(self, board, depth, color, alpha, beta):
    legal_moves = MoveGenerator(board).generate_moves()

    # Base Case: If the target depth is reached or there are no legal moves
    if depth == 0 or not legal_moves:
        return self.evaluate(board), None

    best_move = None
    if color == 0: # Maximizing player (White)
        max_eval = float('-inf')
        for move in legal_moves:
            # Simulate the move on the board and recursively search
            pos = board.sim_move(move)
            eval, _ = self.minimax_ab(pos, depth - 1, 1, alpha, beta)

            # Update the best move if a better move was found
            if eval > max_eval:
                max_eval, best_move = eval, move

            # Update alpha and prune branch if beta <= alpha
            alpha = max(alpha, eval)
            if beta <= alpha:
                break
        
        return max_eval, best_move
            
    else: # Minimizing player (Black)
        min_eval = float('inf')

        for move in legal_moves:
            pos = board.sim_move(move)
            eval, _ = self.minimax_ab(pos, depth - 1, 0, alpha, beta)
            if eval < min_eval:
                min_eval, best_move = eval, move
            
            # Update beta and prune if beta <= alpha
            beta = min(beta, eval)
            if beta <= alpha:
                break

        return min_eval, best_move
```

## Other Optimizations

### Transposition Tables

To further optimize the search process, [transposition tables](https://www.chessprogramming.org/Transposition_Table) are used. Because a new search is performed each time it is the player's turn to move, many positions will be processed repeatedly. To remedy this, every processed position is stored in a lookup dictionary. Each entry contains information about previous evaluations and searches done from that position. Instead of performing expensive, repetitive calculations, recognizing a repeated position allows the engine to skip previously performed calculations by extracting the necessary information from the transposition table.

### Zobrist Hashing
To manage the transposition tables efficiently, [Zobrist Hashing](https://www.chessprogramming.org/Zobrist_Hashing) is utilized as the hash key. This technique leverages the memory-efficient binary representation of the game state. The algorithm calculates a simple but relatively unique hash code to each board configuration, enabling quick storage and retrieval of previously evaluated positions. Zobrist hashing ensures that the engine can rapidly identify and access stored evaluations, speeding up the process of reading from and writing to the transposition table.

## Python's Limitations

As noted earlier, Python's inherent characteristics introduced several performance limitations, making it less suitable for the demanding requirements of a chess engine.

Python's interpreted nature, dynamic typing, garbage collection, and Global Interpreter Lock (GIL) add overhead contributing to slower execution which is significant for performance-intensive applications like chess engines. As a language, Python offers these features for speed of development and ease of use, however the lack of low-level control can degrade performance when needed.

## Integration and Deployment

### AWS

To accommodate the computational demands of the chess engine, I integrated AWS Lambda to dynamically scale processing power. This serverless compute service allows the engine to offload intensive calculations to the cloud. Using AWS Lambda ensures that the engine can perform deep searches and complex evaluations without being limited by local hardware constraints. Although making a Lambda call does introduce minor overhead, this is a static amount and does not scale with increased computations. Thus, I have found that there are no significant drawbacks associated with this approach, making it an efficient and reliable solution for enhancing the engine’s reliability and availability.

### UCI Protocol

The [Universal Chess Interface](https://www.wbec-ridderkerk.nl/html/UCIProtocol.html) (UCI) protocol is used to facilitate communication between the chess engine and various chess GUI clients. UCI standardizes how engines and user interfaces interact, allowing the engine to be compatible with multiple chess platforms and tools. Implementing UCI ensures that the engine can easily connect with and be used in different environments, providing flexibility and ease of use for various applications.


### Lichess Integration

Lichess, a popular online chess platform, provides a perfect testing ground for the engine. By integrating with Lichess, the engine can play against other engines and human opponents. This integration is achieved through the [Lichess Bot API](https://github.com/lichess-bot-devs/lichess-bot), which allows the engine to communicate with the platform, make moves, and receive opponent moves in real-time.

## Concluding Thoughts and Future Direction

The development of my chess engine over the past few months has been an immensely rewarding journey, allowing me to deep dive into the world of chess, game theory, algorithms, machine language, and performance optimization within the context of my personal chess hobby. I went into this project not really sure what to expect, and the breadth of knowledge available still blew me away. 

My engine achieved an intermediate rating of around 1400 on Lichess, performing at a human competitive level. The biggest hurdle was optimizing enough to allow deep searches in Python. With 10 seconds per move, my engine could generally search only 4-6 moves deep. Beyond that, the search time grows too exponentially for real-time games.

Although there are many enhancements I'd like to make, for now, I'm marking this point as a pause in the project. For anyone intrigued by the technical depths of chess programming, I encourage exploring the resources I've used and perhaps even contributing to my engine's ongoing journey on GitHub.

- **[Dex](https://github.com/edwardkong/Dex/)** — My pure Python engine, on github.
- **[ChessProgramming Wiki](https://www.chessprogramming.org/Main_Page)** — An invaluable resource on algorithms, techniques, and the history involved in programming chess engines.
- **[Lichess](https://lichess.org)** — An open-source platform to play chess human vs human or engine vs engine.
- **[Sebastian Lague](https://www.youtube.com/watch?v=U4ogK0MIzqk)** — whose video on building his chess engine inspired mine.
- **[Sunfish](https://github.com/thomasahle/sunfish)** - one of the top Python chess engines from which I drew guidance and inspiration from.