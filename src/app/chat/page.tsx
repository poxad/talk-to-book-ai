// "use client";

// import React, { useState, useEffect, useRef } from "react";
// import Sidebar from "../../components/Sidebar";
// import { useSearchParams } from "next/navigation";
// import ReactMarkdown from "react-markdown";
// import remarkBreaks from "remark-breaks";

// export default function Chatbot() {
// 	// const { id } = useParams();
// 	const [messages, setMessages] = useState([
// 		{ text: "Hello! How can I assist you today?", sender: "bot" },
// 	]);
// 	const [input, setInput] = useState("");
// 	const [isLoading, setIsLoading] = useState(false);
// 	const [suggestedPrompts, setSuggestedPrompts] = useState([]);
// 	const searchParams = useSearchParams();
// 	const book = searchParams.get("book");
// 	const hasFetched = useRef(false);

// 	useEffect(() => {
// 		const savedChat = JSON.parse(localStorage.getItem("chatHistory")) || [];
// 		if (savedChat.length > 0) {
// 			setMessages(savedChat);
// 		}
// 	}, []);

// 	useEffect(() => {
// 		localStorage.setItem("chatHistory", JSON.stringify(messages));
// 	}, [messages]);

// 	const fetchSuggestedPrompts = async () => {
// 		try {
// 			const response = await fetch("http://127.0.0.1:8000/suggest-prompts", {
// 				method: "POST",
// 				headers: {
// 					"Content-Type": "application/json",
// 				},
// 				body: JSON.stringify({ chat_history: messages, book: book }),
// 			});

// 			if (!response.ok) {
// 				throw new Error("Failed to fetch suggested prompts");
// 			}

// 			const data = await response.json();
// 			setSuggestedPrompts(data.suggested_prompts);
// 		} catch (error) {
// 			console.error("Error fetching suggested prompts:", error);
// 		}
// 	};

// 	const sendMessage = async (message = input) => {
// 		if (!message.trim()) return;

// 		const userMessage = { text: message, sender: "user" };
// 		setMessages((prev) => [...prev, userMessage]);
// 		setInput("");
// 		setIsLoading(true);

// 		try {
// 			const response = await fetch("http://127.0.0.1:8000/chat", {
// 				method: "POST",
// 				headers: {
// 					"Content-Type": "application/json",
// 				},
// 				body: JSON.stringify({ user_input: message, book: book }),
// 			});

// 			if (!response.ok) {
// 				throw new Error("Failed to fetch response from the server");
// 			}

// 			const botMessage = { text: "", sender: "bot" };
// 			setMessages((prev) => [...prev, botMessage]);

// 			const reader = response.body.getReader();
// 			const decoder = new TextDecoder();
// 			let done = false;
// 			let fullResponse = "";
// 			while (!done) {
// 				const { value, done: readerDone } = await reader.read();
// 				done = readerDone;
// 				const chunk = decoder.decode(value, { stream: true });
// 				setMessages((prev) =>
// 					prev.map((msg, idx) =>
// 						idx === prev.length - 1 && msg.sender === "bot"
// 							? { ...msg, text: msg.text + chunk }
// 							: msg
// 					)
// 				);
// 				fullResponse += chunk;
// 			}
// 			fetchSuggestedPrompts();
// 		} catch (error) {
// 			console.error("Error calling FastAPI backend:", error);
// 			setMessages((prev) => [
// 				...prev,
// 				{
// 					text: "Sorry, something went wrong. Please try again.",
// 					sender: "bot",
// 				},
// 			]);
// 		} finally {
// 			setIsLoading(false);
// 		}
// 	};

// 	const handleNewChat = () => {
// 		setMessages([
// 			{ text: "Hello! How can I assist you today?", sender: "bot" },
// 		]);
// 		setSuggestedPrompts([]);
// 		localStorage.removeItem("chatHistory");
// 	};

// 	useEffect(() => {
// 		if (!hasFetched.current) {
// 			hasFetched.current = true;
// 			fetchSuggestedPrompts();
// 		}
// 	}, []);

// 	return (
// 		<div className="flex h-screen bg-gray-50 dark:bg-gray-900">
// 			<Sidebar onNewChat={handleNewChat} book={book} />
// 			<div className="flex flex-col flex-1 items-center p-8 gap-6 overflow-y-auto">
// 				<h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
// 					Chatbot for "{book}"
// 				</h1>
// 				<div className="w-full flex-1 rounded-lg p-4 flex flex-col gap-4">
// 					{messages.map((msg, index) => (
// 						<div
// 							key={index}
// 							className={`flex items-start gap-3 ${
// 								msg.sender === "user" ? "justify-end" : "justify-start"
// 							}`}
// 						>
// 							{msg.sender === "bot" && (
// 								<div className="w-10 h-10 flex items-center justify-center bg-blue-500 text-white rounded-full">
// 									AI
// 								</div>
// 							)}
// 							<div
// 								className={`p-3 rounded-lg max-w-[70%] ${
// 									msg.sender === "user"
// 										? "bg-blue-500 text-white"
// 										: " text-gray-900 dark:text-gray-100"
// 								} shadow-sm transition-all duration-200 ease-in-out`}
// 							>
// 								<div className="whitespace-pre-line">
// 									<ReactMarkdown>{msg.text}</ReactMarkdown>
// 								</div>
// 							</div>

// 							{msg.sender === "user" && (
// 								<div className="w-10 h-10 flex items-center justify-center bg-gray-500 text-white rounded-full">
// 									U
// 								</div>
// 							)}
// 						</div>
// 					))}
// 					{!isLoading &&
// 						suggestedPrompts.map((prompt, index) => (
// 							<button
// 								key={index}
// 								className="ml-12 p-3 text-left max-w-[90%] text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-all duration-200 ease-in-out shadow-sm border"
// 								onClick={() => sendMessage(prompt)}
// 								disabled={isLoading}
// 							>
// 								{prompt}
// 							</button>
// 						))}
// 					{isLoading && (
// 						<div className="flex items-start gap-3 justify-start">
// 							<div className="w-10 h-10 flex items-center justify-center bg-blue-500 text-white rounded-full">
// 								AI
// 							</div>
// 							<div className="p-3 rounded-lg max-w-[70%] bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm">
// 								<div className="flex items-center gap-2">
// 									<div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
// 									<div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
// 									<div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
// 								</div>
// 							</div>
// 						</div>
// 					)}
// 				</div>
// 				<div className="w-3/4 flex gap-2 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg sticky bottom-0">
// 					<input
// 						className="flex-1 p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ease-in-out"
// 						type="text"
// 						value={input}
// 						onChange={(e) => setInput(e.target.value)}
// 						onKeyPress={(e) => e.key === "Enter" && sendMessage()}
// 						placeholder="Type a message..."
// 						disabled={isLoading}
// 					/>
// 					<button
// 						className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ease-in-out"
// 						onClick={() => sendMessage()}
// 						disabled={isLoading}
// 					>
// 						{isLoading ? "Sending..." : "Send"}
// 					</button>
// 				</div>
// 			</div>
// 		</div>
// 	);
// }
