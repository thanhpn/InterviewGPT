import {
  createModel,
  startGoalPrompt,
  executeTaskPrompt,
  createTasksPrompt,
  checkAnswerPrompt,
  extractQuestionPrompt,
  createAnswerPrompt,
} from "../utils/prompts";
import type { ModelSettings } from "../utils/types";
import { env } from "../env/client.mjs";
import { LLMChain } from "langchain/chains";
import { extractQuestions, extractTasks } from "../utils/helpers";

async function startGoalAgent(modelSettings: ModelSettings, goal: string) {
  const completion = await new LLMChain({
    llm: createModel(modelSettings),
    prompt: startGoalPrompt,
  }).call({
    goal,
  });
  console.log("Completion:" + (completion.text as string));
  return extractTasks(completion.text as string, []);
}

async function executeTaskAgent(
  modelSettings: ModelSettings,
  goal: string,
  task: string
) {
  const completion = await new LLMChain({
    llm: createModel(modelSettings),
    prompt: executeTaskPrompt,
  }).call({
    goal,
    task,
  });

  return completion.text as string;
}

async function createTasksAgent(
  modelSettings: ModelSettings,
  goal: string,
  tasks: string[],
  lastTask: string,
  result: string,
  completedTasks: string[] | undefined
) {
  const completion = await new LLMChain({
    llm: createModel(modelSettings),
    prompt: createTasksPrompt,
  }).call({
    goal,
    tasks,
    lastTask,
    result,
  });

  return extractTasks(completion.text as string, completedTasks || []);
}

async function checkAnswerAgent(
  modelSettings: ModelSettings,
  question: string,
  answer: string
) {
  const completion = await new LLMChain({
    llm: createModel(modelSettings),
    prompt: checkAnswerPrompt,
  }).call({
    question,
    answer,
  });

  return completion.text as string;
}

async function extractQuestionFromAnswerAgent(
  modelSettings: ModelSettings,
  answer: string,
  completedTasks: string[] | undefined
) {
  const completion = await new LLMChain({
    llm: createModel(modelSettings),
    prompt: extractQuestionPrompt,
  }).call({
    answer,
  });

  return extractQuestions(completion.text as string, completedTasks || []);
}

async function createAnswerAgent(
  modelSettings: ModelSettings,
  question: string,
) {
  const completion = await new LLMChain({
    llm: createModel(modelSettings),
    prompt: createAnswerPrompt,
  }).call({
    question,
  });

  return completion.text as string;
}

interface AgentService {
  startGoalAgent: (
    modelSettings: ModelSettings,
    goal: string
  ) => Promise<string[]>;
  executeTaskAgent: (
    modelSettings: ModelSettings,
    goal: string,
    task: string
  ) => Promise<string>;
  createTasksAgent: (
    modelSettings: ModelSettings,
    goal: string,
    tasks: string[],
    lastTask: string,
    result: string,
    completedTasks: string[] | undefined
  ) => Promise<string[]>;
  checkAnswerAgent: (
    modelSettings: ModelSettings,
    question: string,
    answer: string
  ) => Promise<string>;
  extractQuestionFromAnswerAgent: (
    modelSettings: ModelSettings,
    answer: string,
    completedTasks: string[] | undefined
  ) => Promise<string[]>;
  createAnswerAgent: (
    modelSettings: ModelSettings,
    question: string
  ) => Promise<string>;
}

const OpenAIAgentService: AgentService = {
  startGoalAgent: startGoalAgent,
  executeTaskAgent: executeTaskAgent,
  createTasksAgent: createTasksAgent,
  checkAnswerAgent: checkAnswerAgent,
  extractQuestionFromAnswerAgent: extractQuestionFromAnswerAgent,
  createAnswerAgent: createAnswerAgent,
};

const MockAgentService: AgentService = {
  startGoalAgent: async (modelSettings, goal) => {
    return await new Promise((resolve) => resolve(["Task 1"]));
  },

  createTasksAgent: async (
    modelSettings: ModelSettings,
    goal: string,
    tasks: string[],
    lastTask: string,
    result: string,
    completedTasks: string[] | undefined
  ) => {
    return await new Promise((resolve) => resolve(["Task 4"]));
  },

  executeTaskAgent: async (
    modelSettings: ModelSettings,
    goal: string,
    task: string
  ) => {
    return await new Promise((resolve) => resolve("Result: " + task));
  },

  checkAnswerAgent: async (
    modelSettings: ModelSettings,
    question: string,
    answer: string
  ) => {
    return await new Promise((resolve) => resolve("Result: " + answer));
  },
  extractQuestionFromAnswerAgent: async (
    modelSettings: ModelSettings,
    answer: string,
    completedTasks: string[] | undefined
  ) => {
    return await new Promise((resolve) => resolve("Result: " + answer));
  },
  createAnswerAgent: async (
    modelSettings: ModelSettings,
    question: string,
  ) => {
    return await new Promise((resolve) => resolve("Result: " + question));
  },
};

export default env.NEXT_PUBLIC_FF_MOCK_MODE_ENABLED
  ? MockAgentService
  : OpenAIAgentService;
