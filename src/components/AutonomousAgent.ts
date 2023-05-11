import axios from "axios";
import type { ModelSettings } from "../utils/types";
import AgentService from "../services/agent-service";
import {
  DEFAULT_MAX_LOOPS_CUSTOM_API_KEY,
  DEFAULT_MAX_LOOPS_FREE,
  DEFAULT_MAX_LOOPS_PAID,
} from "../utils/constants";
import type { Session } from "next-auth";
import { env } from "../env/client.mjs";
import { v4, v1 } from "uuid";
import type { RequestBody } from "../utils/interfaces";
import {
  TASK_STATUS_STARTED,
  TASK_STATUS_EXECUTING,
  TASK_STATUS_COMPLETED,
  TASK_STATUS_FINAL,
  MESSAGE_TYPE_TASK,
  MESSAGE_TYPE_GOAL,
  MESSAGE_TYPE_THINKING,
  MESSAGE_TYPE_SYSTEM,
  TASK_STATUS_INIT,
  TASK_STATUS_WAIT_ANSWER,
} from "../types/agentTypes";
import type { Message, Task } from "../types/agentTypes";

const TIMEOUT_LONG = 1000;
const TIMOUT_SHORT = 800;

class AutonomousAgent {
  name: string;
  goal: string;
  tasks: Message[] = [];
  completedTasks: string[] = [];
  modelSettings: ModelSettings;
  isRunning = true;
  questionStatus = false;
  renderMessage: (message: Message) => void;
  shutdown: () => void;
  numLoops = 0;
  session?: Session;
  _id: string;
  currentQuestion: Task;

  constructor(
    name: string,
    goal: string,
    renderMessage: (message: Message) => void,
    shutdown: () => void,
    modelSettings: ModelSettings,
    session?: Session
  ) {
    this.name = name;
    this.goal = goal;
    this.renderMessage = renderMessage;
    this.shutdown = shutdown;
    this.modelSettings = modelSettings;
    this.session = session;
    this._id = v4();
    this.currentQuestion = {
      taskId: v1().toString(),
      value: 'Please wait',
      status: TASK_STATUS_INIT,
      type: MESSAGE_TYPE_TASK,
    };
  }

  async run() {
    this.sendGoalMessage();
    this.sendThinkingMessage();
    this.sendMessage(this.currentQuestion);
    // Initialize by getting taskValues
    try {
      // input topic and create questions
      const taskValues = await this.getInitialTasks();
      console.log("taskValues", taskValues);
      for (const value of taskValues) {
        // await new Promise((r) => setTimeout(r, TIMOUT_SHORT));
        const task: Task = {
          taskId: v1().toString(),
          value,
          status: TASK_STATUS_STARTED,
          type: MESSAGE_TYPE_TASK,
        };
        // this.sendMessage(task);
        this.tasks.push(task);

      }
      this.sendMessage({ type: MESSAGE_TYPE_TASK, value: 'We will start interview now, please focus on the question' });
    } catch (e) {
      console.log(e);
      this.sendErrorMessage(getMessageFromError(e));
      this.shutdown();
      return;
    }

    await this.loop();
  }

  // show question and wait answer
  // if have answer, check the answer
  async loop() {
    console.log(`Loop ${this.numLoops}`);
    console.log(this.tasks);

    if (!this.isRunning) {
      return;
    }

    if (this.tasks.length === 0) {
      this.sendCompletedMessage();
      this.shutdown();
      return;
    }

    this.numLoops += 1;
    const maxLoops = this.maxLoops();
    if (this.numLoops > maxLoops) {
      this.sendLoopMessage();
      this.shutdown();
      return;
    }


    // Wait before starting
    await new Promise((r) => setTimeout(r, TIMEOUT_LONG));

    // Execute first task
    // Get and remove first task
    this.completedTasks.push(this.tasks[0]?.value || "");

    const currentTask = this.tasks.shift() as Task;
    this.sendThinkingMessage();
    currentTask.status = TASK_STATUS_WAIT_ANSWER;
    console.log('loop currentTask', currentTask)
    this.sendMessage(currentTask);


    // const result = await this.executeTask(currentTask.value);

    // currentTask.status = TASK_STATUS_COMPLETED;
    // currentTask.info = result;
    // this.sendMessage(currentTask);

    // Wait before adding tasks
    await new Promise((r) => setTimeout(r, TIMEOUT_LONG));
    // this.sendThinkingMessage();
    this.sendMessage({ type: MESSAGE_TYPE_TASK, value: 'Waiting your answer...' });
  }

  private maxLoops() {
    const defaultLoops = !!this.session?.user.subscriptionId
      ? DEFAULT_MAX_LOOPS_PAID
      : DEFAULT_MAX_LOOPS_FREE;

    return !!this.modelSettings.customApiKey
      ? this.modelSettings.customMaxLoops || DEFAULT_MAX_LOOPS_CUSTOM_API_KEY
      : defaultLoops;
  }

  async getInitialTasks(): Promise<string[]> {
    if (this.shouldRunClientSide()) {
      if (!env.NEXT_PUBLIC_FF_MOCK_MODE_ENABLED) {
        await testConnection(this.modelSettings);
      }
      return await AgentService.startGoalAgent(this.modelSettings, this.goal);
    }

    const data = {
      modelSettings: this.modelSettings,
      goal: this.goal,
    };
    const res = await this.post(`/api/agent/start`, data);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-argument
    return res.data.newTasks as string[];
  }

  async getAdditionalTasks(
    currentTask: string,
    result: string
  ): Promise<string[]> {
    const taskValues = this.tasks.map((task) => task.value);

    if (this.shouldRunClientSide()) {
      return await AgentService.createTasksAgent(
        this.modelSettings,
        this.goal,
        taskValues,
        currentTask,
        result,
        this.completedTasks
      );
    }

    const data = {
      modelSettings: this.modelSettings,
      goal: this.goal,
      tasks: taskValues,
      lastTask: currentTask,
      result: result,
      completedTasks: this.completedTasks,
    };
    const res = await this.post(`/api/agent/create`, data);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access
    return res.data.newTasks as string[];
  }

  async executeTask(task: string): Promise<string> {
    if (this.shouldRunClientSide()) {
      return await AgentService.executeTaskAgent(
        this.modelSettings,
        this.goal,
        task
      );
    }

    const data = {
      modelSettings: this.modelSettings,
      goal: this.goal,
      task: task,
    };
    const res = await this.post("/api/agent/execute", data);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-argument
    return res.data.response as string;
  }

  async checkAnswer(question: string, answer: string): Promise<string> {
    console.log("checkAnswer 1")
    return await AgentService.checkAnswerAgent(
      this.modelSettings,
      question,
      answer
    );
  }

  private async post(url: string, data: RequestBody) {
    try {
      return await axios.post(url, data);
    } catch (e) {
      this.shutdown();

      if (axios.isAxiosError(e) && e.response?.status === 429) {
        this.sendErrorMessage("Rate limit exceeded. Please slow down. 😅");
      }

      throw e;
    }
  }

  private shouldRunClientSide() {
    return !!this.modelSettings.customApiKey;
  }

  stopAgent() {
    this.sendManualShutdownMessage();
    this.isRunning = false;
    this.shutdown();
    return;
  }


  async getAdditionalQuestions(
    answer: string,
  ): Promise<string[]> {
    const taskValues = this.tasks.map((task) => task.value);
    return await AgentService.extractQuestionFromAnswerAgent(
      this.modelSettings,
      answer,
      this.completedTasks
    );
  }

  async submitAnswer(answer: string) {
    if (!this.currentQuestion) {
      return;
    }
    console.log("submitAnswer ", this.currentQuestion.value, answer)
    this.sendMessage({ type: MESSAGE_TYPE_TASK, value: 'Checking your answer...' });
    // check answer
    this.sendThinkingMessage();
    const result = await this.checkAnswer(this.currentQuestion.value, answer);
    console.log("checkAnswer 2", result)
    // this.currentQuestion.status = TASK_STATUS_COMPLETED;
    // this.currentQuestion.info = result;
    // this.sendMessage(this.currentQuestion);

    this.sendMessage({ type: MESSAGE_TYPE_TASK, value: result });
    await new Promise((r) => setTimeout(r, TIMEOUT_LONG));
    this.sendThinkingMessage();

    if (!this.currentQuestion.fromAnswer && !result.includes("next question")) {
      const newTasks = await this.getAdditionalQuestions(answer);
      for (const value of newTasks) {
        await new Promise((r) => setTimeout(r, TIMOUT_SHORT));
        const task: Task = {
          taskId: v1().toString(),
          value,
          status: TASK_STATUS_STARTED,
          type: MESSAGE_TYPE_TASK,
          fromAnswer: answer,
        };
        this.tasks.push(task);
        this.sendMessage(task);
      }
    }

    // extract new question from answer
    await this.loop();
    console.log("Current queue", this.tasks);
  }

  async createAnswer() {
    if (!this.currentQuestion) {
      return;
    }
    console.log("createAnswer ", this.currentQuestion.value)
    this.sendThinkingMessage();
    const result = await AgentService.createAnswerAgent(
      this.modelSettings,
      this.currentQuestion.value,
    );
    console.log("createAnswer 2", result)
    this.sendMessage({ type: MESSAGE_TYPE_TASK, value: result });
    await new Promise((r) => setTimeout(r, TIMEOUT_LONG));
    this.sendThinkingMessage();

    // extract new question from answer
    await this.loop();
    console.log("Current queue", this.tasks);
  }


  async nextQuestion() {
    if (!this.tasks || this.tasks.length == 0) return;
    this.sendThinkingMessage();
    await new Promise((r) => setTimeout(r, TIMEOUT_LONG));
    // extract new question from answer
    await this.loop();
    console.log("Current queue", this.tasks);
  }



  sendMessage(message: Message) {
    if (this.isRunning) {
      this.renderMessage(message);
    }
  }

  sendGoalMessage() {
    this.sendMessage({ type: MESSAGE_TYPE_GOAL, value: this.goal });
  }

  sendLoopMessage() {
    this.sendMessage({
      type: MESSAGE_TYPE_SYSTEM,
      value: !!this.modelSettings.customApiKey
        ? `This agent has maxed out on loops. To save your wallet, this agent is shutting down. You can configure the number of loops in the advanced settings.`
        : "We're sorry, because this is a demo, we cannot have our agents running for too long. Note, if you desire longer runs, please provide your own API key in Settings. Shutting down.",
    });
  }

  sendManualShutdownMessage() {
    this.sendMessage({
      type: MESSAGE_TYPE_SYSTEM,
      value: `The agent has been manually shutdown.`,
    });
  }

  sendCompletedMessage() {
    this.sendMessage({
      type: MESSAGE_TYPE_SYSTEM,
      value: "All tasks completed. Shutting down.",
    });
  }

  sendThinkingMessage() {
    this.sendMessage({ type: MESSAGE_TYPE_THINKING, value: "" });
  }

  sendErrorMessage(error: string) {
    this.sendMessage({ type: MESSAGE_TYPE_SYSTEM, value: error });
  }
}

const testConnection = async (modelSettings: ModelSettings) => {
  // A dummy connection to see if the key is valid
  // Can't use LangChain / OpenAI libraries to test because they have retries in place
  return await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: modelSettings.customModelName,
      messages: [{ role: "user", content: "Say this is a test" }],
      max_tokens: 7,
      temperature: 0,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${modelSettings.customApiKey ?? ""}`,
      },
    }
  );
};

const getMessageFromError = (e: unknown) => {
  let message =
    "ERROR accessing OpenAI APIs. Please check your API key or try again later";
  if (axios.isAxiosError(e)) {
    const axiosError = e;
    if (axiosError.response?.status === 429) {
      message = `ERROR using your OpenAI API key. You've exceeded your current quota, please check your plan and billing details.`;
    }
    if (axiosError.response?.status === 404) {
      message = `ERROR your API key does not have GPT-4 access. You must first join OpenAI's wait-list. (This is different from ChatGPT Plus)`;
    }
  } else {
    message = `ERROR retrieving initial tasks array. Retry, make your goal more clear, or revise your goal such that it is within our model's policies to run. Shutting Down.`;
  }
  return message;
};

export default AutonomousAgent;
