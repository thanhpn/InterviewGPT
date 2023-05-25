import { OpenAI } from "langchain/llms/openai";
import { PromptTemplate } from "langchain/prompts";
import type { ModelSettings } from "./types";
import { GPT_35_TURBO } from "./constants";

const getServerSideKey = (): string => {
    const keys: string[] = (process.env.OPENAI_API_KEY || "")
        .split(",")
        .map((key) => key.trim())
        .filter((key) => key.length);

    return keys[Math.floor(Math.random() * keys.length)] || "";
};

export const createModel = (settings: ModelSettings) => {
    let _settings: ModelSettings | undefined = settings;
    if (!settings.customModelName) {
        _settings = undefined;
    }

    return new OpenAI({
        openAIApiKey: _settings?.customApiKey || getServerSideKey(),
        temperature: _settings?.customTemperature || 0.9,
        modelName: _settings?.customModelName || GPT_35_TURBO,
        maxTokens: _settings?.maxTokens || 400,
    });
};

export const startGoalPrompt = new PromptTemplate({
    template:
        "You are a recruiter for the `{goal}` and you will provide 10 high quality interview questions to evaluate the competence of candidates with 10% easy, 30% medium. 40% hard. 10 super hard, 10% about system design. You will present the questions in order from easy to hard. Return the response as an array of strings that can be used in JSON.parse()",
    inputVariables: ["goal"],
});

export const executeTaskPrompt = new PromptTemplate({
    template:
        "You are an autonomous task execution AI called AgentGPT. You have the following objective `{goal}`. You have the following tasks `{task}`. Execute the task and return the response as a string.",
    inputVariables: ["goal", "task"],
});

export const createTasksPrompt = new PromptTemplate({
    template:
        "You are an AI task creation agent. You have the following objective `{goal}`. You have the following incomplete tasks `{tasks}` and have just executed the following task `{lastTask}` and received the following result `{result}`. Based on this, create a new task to be completed by your AI system ONLY IF NEEDED such that your goal is more closely reached or completely reached. Return the response as an array of strings that can be used in JSON.parse() and NOTHING ELSE",
    inputVariables: ["goal", "tasks", "lastTask", "result"],
});

export const checkAnswerPrompt = new PromptTemplate({
    template:
        "You are an AI autonomous interviewer. You have to qualify the `{answer}` for question: `{question}` of interviewee is correct or not, if answer not good or interview don't answer you response next question else you have to score the answer. Create the answer and score and a better answer as string.",
    inputVariables: ["question", "answer"],
});

export const extractQuestionPrompt = new PromptTemplate({
    template:
        "You are an autonomous interviewer called AgentGPT. You got the answer: `{answer}` from interviewer. You have to ask 1 question base on this answer, if interviewer don't know or don't have answer you should return empty. create a question and return the response as an array of strings that can be used in JSON.parse()",
    inputVariables: ["answer"],
});

export const createAnswerPrompt = new PromptTemplate({
    template:
        "in interview You create high quality answer for question: `{question}` and return the response as a string.",
    inputVariables: ["question"],
});

export const evaluateInterviewPrompt = new PromptTemplate({
    template:
        "in interview You need evaluate this interview: `{question}` and return the response as a string.",
    inputVariables: ["question"],
});