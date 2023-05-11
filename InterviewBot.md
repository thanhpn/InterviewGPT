

1. User input topic for interview
2. Bot create list question for interviewee, save list quest to QA queue
  - Question:
    - 10% easy, 30% medium. 40% hard. 10 super hard, 10% system design
    - Question focus to deep dive user experience
  - Save question to queue
    - We will score question and create final score per 100 points
3. Bot pick first question to ask interviewee, remove this question on queue and add to asked queue
4. wait interviewee answer
5. evaluate answer and extract related keyword in answer
5.1 create 2 new question from related keyword and push to QA Queue
5.2 scoring answer, if it is wrong answer, explain correct answer for interviewee
6. Continue step 3 until queue empty
7. Complete interview and create report



