"use client";

import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../../../components/Sidebar";
import { useParams, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { FaPaperPlane, FaSync } from "react-icons/fa"; // Import the refresh icon
import remarkBreaks from "remark-breaks";
import { v4 as uuidv4 } from "uuid";

export default function Chatbot() {
	const { id } = useParams();
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [suggestedPrompts, setSuggestedPrompts] = useState([]);
	const searchParams = useSearchParams();
	const book = searchParams.get("book");
	const hasFetched = useRef(false);

	// Load chat history
	useEffect(() => {
		if (id) {
			const savedChat =
				JSON.parse(localStorage.getItem(`chatHistory-${id}`)) || [];
			if (savedChat.length > 0) {
				setMessages(savedChat);
			} else {
				setMessages([
					{ text: "Hello! How can I assist you today?", sender: "bot" },
				]);
			}
		}
	}, [id]);

	// Save chat history
	useEffect(() => {
		if (id) {
			localStorage.setItem(`chatHistory-${id}`, JSON.stringify(messages));
		}
	}, [messages, id]);

	const fetchSuggestedPrompts = async () => {
		try {
			const response = await fetch("http://127.0.0.1:8000/suggest-prompts", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ chat_history: messages, book: book }),
			});

			if (!response.ok) {
				throw new Error("Failed to fetch suggested prompts");
			}

			const data = await response.json();
			setSuggestedPrompts(data.suggested_prompts);
		} catch (error) {
			console.error("Error fetching suggested prompts:", error);
		}
	};

	const sendMessage = async (message = input) => {
		if (!message.trim()) return;

		const userMessage = { text: message, sender: "user" };
		setMessages((prev) => [...prev, userMessage]);
		setInput("");
		setIsLoading(true);
		setSuggestedPrompts([]);

		try {
			const response = await fetch("http://127.0.0.1:8000/chat", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ user_input: message, book: book }),
			});

			if (!response.ok) {
				throw new Error("Failed to fetch response from the server");
			}

			const botMessage = { text: "", sender: "bot" };
			setMessages((prev) => [...prev, botMessage]);

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let done = false;
			let fullResponse = "";
			while (!done) {
				const { value, done: readerDone } = await reader.read();
				done = readerDone;
				const chunk = decoder.decode(value, { stream: true });
				setMessages((prev) =>
					prev.map((msg, idx) =>
						idx === prev.length - 1 && msg.sender === "bot"
							? { ...msg, text: msg.text + chunk }
							: msg
					)
				);
				fullResponse += chunk;
			}

			await fetchSuggestedPrompts();
		} catch (error) {
			console.error("Error calling FastAPI backend:", error);
			setMessages((prev) => [
				...prev,
				{
					text: "Sorry, something went wrong. Please try again.",
					sender: "bot",
				},
			]);
		} finally {
			setIsLoading(false);
		}
	};

	const regenerateResponse = async (messageIndex) => {
		const userMessage = messages[messageIndex];
		if (!userMessage || userMessage.sender !== "user") return;

		setIsLoading(true);

		try {
			const response = await fetch("http://127.0.0.1:8000/chat", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ user_input: userMessage.text, book: book }),
			});

			if (!response.ok) {
				throw new Error("Failed to fetch response from the server");
			}

			const botMessage = { text: "", sender: "bot" };
			setMessages((prev) => [...prev.slice(0, messageIndex + 1), botMessage]);

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let done = false;
			let fullResponse = "";
			while (!done) {
				const { value, done: readerDone } = await reader.read();
				done = readerDone;
				const chunk = decoder.decode(value, { stream: true });
				setMessages((prev) =>
					prev.map((msg, idx) =>
						idx === prev.length - 1 && msg.sender === "bot"
							? { ...msg, text: msg.text + chunk }
							: msg
					)
				);
				fullResponse += chunk;
			}
		} catch (error) {
			console.error("Error calling FastAPI backend:", error);
			setMessages((prev) => [
				...prev,
				{
					text: "Sorry, something went wrong. Please try again.",
					sender: "bot",
				},
			]);
		} finally {
			setIsLoading(false);
		}
	};

	const handleNewChat = () => {
		setMessages([
			{ text: "Hello! How can I assist you today?", sender: "bot" },
		]);
		setSuggestedPrompts([]);
	};

	useEffect(() => {
		if (!hasFetched.current) {
			hasFetched.current = true;
			fetchSuggestedPrompts();
		}
	}, []);

	return (
		<div className="flex h-screen bg-gradient-to-br from-blue-100 to-white text-gray-900">
			<Sidebar onNewChat={handleNewChat} book={book} currentChatId={id} />
			<div className="flex flex-col flex-1 items-center p-8 gap-6 overflow-y-auto">
				<h1 className="text-4xl font-extrabold text-blue-600 mb-6">
					Chatbot for "{book}"
				</h1>
				<div className="w-full flex-1 rounded-2xl p-6 bg-white shadow-lg flex flex-col gap-4">
					{messages.map((msg, index) => (
						<div
							key={index}
							className={`flex items-start gap-3 ${
								msg.sender === "user" ? "justify-end" : "justify-start"
							}`}
						>
							{msg.sender === "bot" && (
								<div className="w-10 h-10 flex items-center justify-center bg-blue-500 text-white rounded-full shadow-md">
									AI
								</div>
							)}
							<div
								className={`group relative p-4 rounded-2xl max-w-[70%] ${
									msg.sender === "user"
										? "bg-blue-500 text-white"
										: "bg-gray-100 text-gray-800"
								} shadow-sm transition-all duration-200 ease-in-out`}
							>
								{msg.sender === "user" && (
									<button
										className="absolute -left-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 bg-gray-200 rounded-full hover:bg-gray-300"
										onClick={() => regenerateResponse(index)}
										title="Regenerate response"
									>
										<FaSync className="text-gray-700" />
									</button>
								)}
								<div className="whitespace-pre-line">
									<ReactMarkdown>{msg.text}</ReactMarkdown>
								</div>
							</div>

							{msg.sender === "user" && (
								<div className="w-10 h-10 flex items-center justify-center bg-gray-500 text-white rounded-full shadow-md">
									U
								</div>
							)}
						</div>
					))}
					{!isLoading &&
						suggestedPrompts.map((prompt, index) => (
							<button
								key={index}
								className="ml-12 p-3 text-left max-w-[90%] text-gray-800 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-all duration-200 ease-in-out shadow-sm border border-gray-200"
								onClick={() => sendMessage(prompt)}
								disabled={isLoading}
							>
								{prompt}
							</button>
						))}
					{isLoading && (
						<div className="flex items-start gap-3 justify-start">
							<div className="w-10 h-10 flex items-center justify-center bg-blue-500 text-white rounded-full shadow-md">
								AI
							</div>
							<div className="p-4 rounded-2xl max-w-[70%] bg-gray-100 text-gray-800 shadow-sm">
								<div className="flex items-center gap-2">
									<div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
									<div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
									<div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
								</div>
							</div>
						</div>
					)}
				</div>
				<div className="w-3/4 flex gap-2 p-4 bg-white rounded-2xl shadow-lg sticky bottom-0">
					<input
						className="flex-1 p-3 border border-gray-300 rounded-2xl bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
						type="text"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyPress={(e) => e.key === "Enter" && sendMessage()}
						placeholder="Type a message..."
						disabled={isLoading}
					/>
					<button
						className="flex items-center justify-center p-3 bg-blue-500 text-white rounded-2xl hover:bg-blue-600 transition-all shadow-md"
						onClick={() => sendMessage()}
						disabled={isLoading}
					>
						<FaPaperPlane size={20} />
					</button>
				</div>
			</div>
		</div>
	);
}
