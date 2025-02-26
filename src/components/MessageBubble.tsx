import React from "react";
import ReactMarkdown from "react-markdown";
import { FaSync } from "react-icons/fa";
import { v4 as uuidv4 } from "uuid";

const MessageBubble = ({ message, onRegenerate }) => {
	const formatTextWithParagraphs = (text) => {
		return text.split("\n\n").map((paragraph, index) => (
			<div key={uuidv4()} className="markdown-content">
				<ReactMarkdown key={index} className="mb-4">
					{paragraph}
				</ReactMarkdown>
			</div>
		));
	};

	return (
		<div
			className={`flex items-start gap-3 ${
				message.sender === "user" ? "justify-end" : "justify-start"
			}`}
		>
			{message.sender === "bot" && (
				<div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-gray-500 text-white rounded-full shadow-md mt-2">
					AI
				</div>
			)}
			<div
				className={`group relative p-3 md:p-4 rounded-2xl max-w-[80%] md:max-w-[70%] ${
					message.sender === "user" ? "bg-gray-700 text-white" : "text-white"
				} transition-all duration-200 ease-in-out`}
			>
				{message.sender === "user" && (
					<button
						className="absolute -left-10 md:-left-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 bg-gray-200 rounded-full hover:bg-gray-300"
						onClick={onRegenerate}
						title="Regenerate response"
					>
						<FaSync className="text-gray-700" />
					</button>
				)}
				{formatTextWithParagraphs(message.text)}
			</div>
			{message.sender === "user" && (
				<div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-gray-500 text-white rounded-full shadow-md mt-2">
					U
				</div>
			)}
		</div>
	);
};

export default MessageBubble;
