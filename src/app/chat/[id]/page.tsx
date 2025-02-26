"use client";

import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../../../components/Sidebar";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "../../supabaseClient";
import { v4 as uuidv4 } from "uuid";
import MessageBubble from "../../../components//MessageBubble";
import LoadingIndicator from "../../../components/LoadingIndicator";
import SuggestedPrompts from "../../../components/SuggestedPrompts";
import ChatInput from "../../../components/ChatInput";

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

				if (data && data.message && data.message.length > 0) {
					setMessages(data.message);
				} else {
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
				const { data: existingChat, error: fetchError } = await supabase
					.from("chat_history")
					.select("message")
					.eq("chat_id", id)
					.single();

				if (fetchError && fetchError.code !== "PGRST116") {
					console.error("Error fetching existing chat history:", fetchError);
					return;
				}

				const existingMessages = existingChat?.message || [];
				const newMessages = messages.slice(existingMessages.length);

				if (newMessages.length > 0) {
					const updatedMessages = [...existingMessages, ...newMessages];
					const { error: updateError } = await supabase
						.from("chat_history")
						.upsert([{ chat_id: id, message: updatedMessages }], {
							onConflict: "chat_id",
						});

					if (updateError) {
						console.error("Error saving chat history:", updateError);
					}
				}
			}
		};

		saveChatHistory();
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
			const { data: existingChat, error: fetchError } = await supabase
				.from("chat_history")
				.select("message")
				.eq("chat_id", id)
				.single();

			if (fetchError && fetchError.code !== "PGRST116") {
				throw fetchError;
			}

			const existingMessages = existingChat?.message || [];
			const updatedMessages = [...existingMessages, userMessage];

			const { error: updateError } = await supabase
				.from("chat_history")
				.update({ message: updatedMessages })
				.eq("chat_id", id);

			if (updateError) {
				throw updateError;
			}

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

			const updatedMessagesWithBot = [
				...updatedMessages,
				{ text: fullResponse, sender: "bot" },
			];

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

	const regenerateResponse = async (messageIndex) => {
		const userMessage = messages[messageIndex];
		if (!userMessage || userMessage.sender !== "user") return;

		setIsLoading(true);

		try {
			const updatedMessages = messages.slice(0, messageIndex + 1);
			setMessages(updatedMessages);

			const { error: updateError } = await supabase
				.from("chat_history")
				.update({ message: updatedMessages })
				.eq("chat_id", id);

			if (updateError) {
				throw updateError;
			}

			const response = await fetch("http://127.0.0.1:8000/chat", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					user_input: userMessage.text,
					book: book,
					chat_history: updatedMessages,
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
				await new Promise((resolve) => setTimeout(resolve, 50));
			}

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
				<h1 className="md:text-2xl font-extrabold text-white mb-2">
					Chatbot for "{book}"
				</h1>
				<div className="w-full flex-1 rounded-2xl p-4 md:p-6 flex flex-col gap-4">
					{messages.map((msg, index) => (
						<MessageBubble
							key={index}
							message={msg}
							onRegenerate={() => regenerateResponse(index)}
						/>
					))}
					<SuggestedPrompts
						prompts={suggestedPrompts}
						onSendMessage={sendMessage}
						isLoading={isLoading}
					/>
					{isLoading && <LoadingIndicator />}
				</div>
				<ChatInput
					input={input}
					setInput={setInput}
					onSendMessage={sendMessage}
					isLoading={isLoading}
				/>
			</div>
		</div>
	);
}
