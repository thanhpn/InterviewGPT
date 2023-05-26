import { type ReactNode } from "react";
import Head from "next/head";
import DottedGridBackground from "../components/DottedGridBackground";
import clsx from "clsx";
import { useTranslation } from 'react-i18next';

interface LayoutProps {
    children: ReactNode;
    className?: string;
    centered?: boolean;
}

const DefaultLayout = (props: LayoutProps) => {
    const [t] = useTranslation();
    const description =
        t('Assemble, configure, and deploy autonomous AI Agents in your browser.');
    return (
        <div
            className={clsx(
                "flex flex-col bg-gradient-to-b from-[#2B2B2B] to-[#1F1F1F]",
                props.centered && "items-center justify-center"
            )}
        >
            <Head>
                <title>AgentGPT</title>
                <meta name="description" content={description} />
                <meta name="twitter:site" content="@InterviewGPT" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="InterviewGPT 🤖" />
                <meta name="twitter:description" content={description} />
                <meta
                    name="twitter:image"
                    content="https://github.com/thanhpn/InterviewGPT/blob/ab2bda38fd59d4bb40ab27c890018c4103a1da66/public/banner.png?raw=true"
                />
                <meta name="twitter:image:width" content="1280" />
                <meta name="twitter:image:height" content="640" />
                <meta
                    property="og:title"
                    content="InterviewGPT: Autonomous AI in your browser 🤖"
                />
                <meta
                    property="og:description"
                    content="Assemble, configure, and deploy autonomous AI Interview in your browser."
                />
                <meta property="og:url" content="https://interviewgpt.netlify.app" />
                <meta
                    property="og:image"
                    content="https://github.com/thanhpn/InterviewGPT/blob/ab2bda38fd59d4bb40ab27c890018c4103a1da66/public/banner.png?raw=true"
                />
                <meta property="og:image:width" content="1280" />
                <meta property="og:image:height" content="640" />
                <meta property="og:type" content="website" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <DottedGridBackground
                className={clsx("min-w-screen min-h-screen", props.className)}
            >
                {props.children}
            </DottedGridBackground>
        </div>
    );
};

export default DefaultLayout;
