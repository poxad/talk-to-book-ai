"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactDom from "react-dom";
import Sidebar from "../../../components/Sidebar";
import { useParams, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { MarkdownHooks } from "react-markdown";
import { FaPaperPlane, FaSync } from "react-icons/fa";
import remarkBreaks from "remark-breaks";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../../supabaseClient"; // Import Supabase client
export default function Chatbot() {
	const { id } = useParams();
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [suggestedPrompts, setSuggestedPrompts] = useState([]);
	const searchParams = useSearchParams();
	const book = searchParams.get("book");
	const hasFetched = useRef(false);

	// Load chat history from Supabase
	useEffect(() => {
		const fetchChatHistory = async () => {
			if (id) {
				const { data, error } = await supabase
					.from("chat_history")
					.select("message")
					.eq("chat_id", id)
					.single();
				console.log("id: ", id);
				// console.log("Current message in id: ", data.message);
				// if (error) {
				// 	console.error("Error fetching chat history:", error);
				// 	return;
				// }

				if (data && data.message && data.message.length > 0) {
					// Set the messages state with the fetched message array
					setMessages(data.message);
				} else {
					// Set a default welcome message if no history exists
					setMessages([
						{ text: "Hello! How can I assist you today?", sender: "bot" },
					]);
				}
			}
		};
		fetchChatHistory();
	}, [id]);

	// Save chat history to Supabase
	useEffect(() => {
		const saveChatHistory = async () => {
			if (id && messages.length > 0) {
				// Fetch the existing message array for the chat_id
				const { data: existingChat, error: fetchError } = await supabase
					.from("chat_history")
					.select("message")
					.eq("chat_id", id)
					.single();

				if (fetchError && fetchError.code !== "PGRST116") {
					console.error("Error fetching existing chat history:", fetchError);
					return;
				}

				// Initialize the message array
				// console.log("existingChat: ", existingChat);
				const existingMessages = existingChat?.message || [];
				// console.log("existingMessages: ", existingMessages);

				// Check if the new messages are already in the existing messages
				const newMessages = messages.slice(existingMessages.length);

				if (newMessages.length > 0) {
					// Append the new messages to the existing array
					const updatedMessages = [...existingMessages, ...newMessages];

					// Update the row in the chat_history table
					const { error: updateError } = await supabase
						.from("chat_history")
						.upsert([{ chat_id: id, message: updatedMessages }], {
							onConflict: "chat_id", // Handle conflicts based on chat_id
						});

					if (updateError) {
						console.error("Error saving chat history:", updateError);
					}
				}
			}
		};

		saveChatHistory();
	}, [messages, id]); // Save chat history whenever `messages` or `id` changes

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
			// Fetch the existing message array for the chat_id
			const { data: existingChat, error: fetchError } = await supabase
				.from("chat_history")
				.select("message")
				.eq("chat_id", id)
				.single();

			if (fetchError && fetchError.code !== "PGRST116") {
				throw fetchError;
			}

			// Initialize the message array
			const existingMessages = existingChat?.message || [];

			// Append the new user message to the array
			const updatedMessages = [...existingMessages, userMessage];

			// Update the row in the chat_history table
			const { error: updateError } = await supabase
				.from("chat_history")
				.update({ message: updatedMessages })
				.eq("chat_id", id);

			if (updateError) {
				throw updateError;
			}

			// Send message to the backend and get bot response
			const response = await fetch("http://127.0.0.1:8000/chat", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					chat_history: messages,
					user_input: message,
					book: book,
				}),
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

			// Append the bot message to the existing message array
			const updatedMessagesWithBot = [
				...updatedMessages,
				{ text: fullResponse, sender: "bot" },
			];

			// Update the row in the chat_history table
			const { error: botMessageError } = await supabase
				.from("chat_history")
				.update({ message: updatedMessagesWithBot })
				.eq("chat_id", id);

			if (botMessageError) {
				throw botMessageError;
			}

			await fetchSuggestedPrompts();
		} catch (error) {
			console.error("Error:", error);
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
	const formatTextWithParagraphs = (text) => {
		// console.log(text);f
		return text.split("\n\n").map((paragraph, index) => (
			<div key={uuidv4()} className="markdown-content">
				<ReactMarkdown key={index} className="mb-4 ">
					{paragraph}
				</ReactMarkdown>
			</div>
		));
	};

	const regenerateResponse = async (messageIndex) => {
		const userMessage = messages[messageIndex];
		if (!userMessage || userMessage.sender !== "user") return;

		setIsLoading(true);

		try {
			// Delete all messages after the user's message
			const updatedMessages = messages.slice(0, messageIndex + 1);

			// Update the local state to reflect the deleted messages
			setMessages(updatedMessages);

			// Update the row in the chat_history table to remove the deleted messages
			const { error: updateError } = await supabase
				.from("chat_history")
				.update({ message: updatedMessages })
				.eq("chat_id", id);

			if (updateError) {
				throw updateError;
			}

			// Send the user message and updated chat history to the backend
			const response = await fetch("http://127.0.0.1:8000/chat", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					user_input: userMessage.text,
					book: book,
					chat_history: updatedMessages, // Send only the relevant chat history
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to fetch response from the server");
			}

			// Create a placeholder for the bot's response
			const botMessage = { text: "", sender: "bot" };
			setMessages((prev) => [...prev, botMessage]);

			// Stream the bot's response incrementally
			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let done = false;
			let fullResponse = ""; // Declare fullResponse outside the loop

			while (!done) {
				const { value, done: readerDone } = await reader.read();
				done = readerDone;
				const chunk = decoder.decode(value, { stream: true });

				// Update the bot's message incrementally
				setMessages((prev) =>
					prev.map((msg, idx) =>
						idx === prev.length - 1 && msg.sender === "bot"
							? { ...msg, text: msg.text + chunk }
							: msg
					)
				);

				fullResponse += chunk; // Append the chunk to fullResponse

				// Add a small delay to simulate streaming
				await new Promise((resolve) => setTimeout(resolve, 50)); // 50ms delay
			}

			// Append the bot's response to the chat history in Supabase
			const finalMessages = [
				...updatedMessages,
				{ text: fullResponse, sender: "bot" },
			];

			const { error: botMessageError } = await supabase
				.from("chat_history")
				.update({ message: finalMessages })
				.eq("chat_id", id);

			if (botMessageError) {
				throw botMessageError;
			}
		} catch (error) {
			console.error("Error:", error);
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
		const newChatId = uuidv4();
		setMessages([
			{ text: "Hello! How can I assist you today?", sender: "bot" },
		]);
		setSuggestedPrompts([]);
		// Optionally, navigate to the new chat URL
		// router.push(`/chat/${newChatId}?book=${book}`);
	};

	useEffect(() => {
		if (!hasFetched.current) {
			hasFetched.current = true;
			fetchSuggestedPrompts();
		}
	}, []);

	return (
		<div className="flex h-screen bg-gray-900 text-gray-900">
			<Sidebar onNewChat={handleNewChat} book={book} currentChatId={id} />
			<div className="flex flex-col flex-1 items-center p-4 md:p-8 gap-4 md:gap-6 overflow-y-auto">
				<h1 className=" md:text-2xl font-extrabold text-white mb-2">
					Chatbot for "{book}"
				</h1>
				<div className="w-full flex-1 rounded-2xl p-4 md:p-6 flex flex-col gap-4">
					{messages.map((msg, index) => (
						<div
							key={index}
							className={`flex items-start gap-3 ${
								msg.sender === "user" ? "justify-end" : "justify-start"
							}`}
						>
							{msg.sender === "bot" && (
								<div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-gray-500 text-white rounded-full shadow-md mt-2">
									AI
								</div>
							)}
							<div
								className={`group relative p-3 md:p-4 rounded-2xl max-w-[80%] md:max-w-[70%] ${
									msg.sender === "user"
										? "bg-gray-700 text-white"
										: "text-white"
								}  transition-all duration-200 ease-in-out`}
							>
								{msg.sender === "user" && (
									<button
										className="absolute -left-10 md:-left-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 bg-gray-200 rounded-full hover:bg-gray-300"
										onClick={() => regenerateResponse(index)}
										title="Regenerate response"
									>
										<FaSync className="text-gray-700" />
									</button>
								)}
								{formatTextWithParagraphs(msg.text)}
							</div>

							{msg.sender === "user" && (
								<div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-gray-500 text-white rounded-full shadow-md mt-2">
									U
								</div>
							)}
						</div>
					))}
					{!isLoading &&
						suggestedPrompts.map((prompt, index) => (
							<button
								key={index}
								className="ml-10 md:ml-12 p-2 md:p-3 text-left max-w-[90%] text-white bg-gray-700 rounded-2xl hover:bg-gray-800 transition-all duration-200 ease-in-out shadow-sm border border-gray-200"
								onClick={() => sendMessage(prompt)}
								disabled={isLoading}
							>
								{prompt}
							</button>
						))}
					{isLoading && (
						<div className="flex items-start gap-3 justify-start">
							<div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-gray-500 text-white rounded-full shadow-md">
								AI
							</div>
							<div className="p-3 md:p-4 rounded-2xl max-w-[80%] md:max-w-[70%] bg-gray-100 text-gray-800 shadow-sm">
								<div className="flex items-center gap-2">
									<div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
									<div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
									<div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
								</div>
							</div>
						</div>
					)}
				</div>
				<div className="w-full md:w-3/4 flex gap-2 p-2 md:p-4 bg-gray-700 rounded-2xl shadow-lg sticky bottom-0">
					<input
						className="flex-1 p-2 md:p-3 rounded-2xl bg-gray-800 text-white focus:ring-2 focus:ring-blue-500 outline-none shadow-sm text-sm md:text-base"
						type="text"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyPress={(e) => e.key === "Enter" && sendMessage()}
						placeholder="Type a message..."
						disabled={isLoading}
					/>
					<button
						className="flex items-center justify-center p-2 md:p-3 bg-gray-500 text-white rounded-2xl hover:bg-gray-600 transition-all shadow-md w-10 md:w-12"
						onClick={() => sendMessage()}
						disabled={isLoading}
					>
						<FaPaperPlane className="w-4 h-4 md:w-5 md:h-5" />
					</button>
				</div>
			</div>
		</div>
	);
}
