"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaTrash } from "react-icons/fa"; // Import the trash icon
import { supabase } from "../app/supabaseClient";

export default function Sidebar({ onNewChat, book, currentChatId }) {
	const [history, setHistory] = useState([]);
	const [collapsed, setCollapsed] = useState(false);
	const router = useRouter();

	// Load chat history from Supabase when the component mounts
	useEffect(() => {
		const fetchChatHistory = async () => {
			const { data, error } = await supabase
				.from("chat_history")
				.select("chat_id, book, created_at")
				.order("created_at", { ascending: false });

			if (error) {
				console.error("Error fetching chat history:", error);
				return;
			}

			// Format the history data
			const formattedHistory = data.map((chat, index) => ({
				id: chat.chat_id,
				title: `Chat ${index + 1}`,
				book: chat.book,
			}));

			setHistory(formattedHistory);
		};

		fetchChatHistory();
	}, []);

	// Add a new chat to the history when a new chat is started
	useEffect(() => {
		const addNewChatToHistory = async () => {
			if (currentChatId && book) {
				// Check if the chat already exists in the history
				const chatExists = history.some((chat) => chat.id === currentChatId);

				if (!chatExists) {
					const newChat = {
						id: currentChatId,
						title: `Chat ${history.length + 1}`,
						book,
					};

					// Check if the chat already exists in Supabase
					const { data: existingChat, error: fetchError } = await supabase
						.from("chat_history")
						.select("chat_id")
						.eq("chat_id", currentChatId)
						.single();

					if (fetchError && fetchError.code !== "PGRST116") {
						// PGRST116 means "No rows returned"
						console.error("Error checking for existing chat:", fetchError);
						return;
					}

					if (!existingChat) {
						// Save the new chat to Supabase using upsert
						const { error } = await supabase
							.from("chat_history")
							.upsert([{ chat_id: currentChatId, book, message: [] }], {
								onConflict: "chat_id", // Handle conflicts based on chat_id
							});

						if (error) {
							console.error("Error saving new chat to Supabase:", error);
							return;
						}

						// Update the local state
						setHistory((prevHistory) => [newChat, ...prevHistory]); // Add new chat to the top
					}
				}
			}
		};

		addNewChatToHistory();
	}, [currentChatId, book]); // Remove `history` from dependencies to avoid re-renders

	const startNewChat = () => {
		router.push(`/`);
	};

	const toggleCollapse = () => {
		setCollapsed((prev) => !prev);
	};

	const navigateToChat = (chat) => {
		router.push(`/chat/${chat.id}?book=${chat.book}`);
	};

	const deleteChat = async (chatId) => {
		try {
			// Delete the chat from Supabase
			const { error } = await supabase
				.from("chat_history")
				.delete()
				.eq("chat_id", chatId);

			if (error) {
				throw error;
			}

			// Update the local state
			setHistory((prevHistory) =>
				prevHistory.filter((chat) => chat.id !== chatId)
			);
		} catch (error) {
			console.error("Error deleting chat:", error);
		}
	};

	return (
		<div
			className={`bg-gradient-to-b from-gray-900 to-gray-800 text-white shadow-lg p-4 flex flex-col transition-all duration-300 ease-in-out ${
				collapsed ? "w-16 md:w-20" : "w-full md:w-1/5"
			} rounded-r-2xl border-r border-gray-700`}
		>
			<div className="flex justify-between items-center mb-4">
				{!collapsed && (
					<h2 className="text-xl font-bold text-blue-400">
						📖 Talk to Book AI
					</h2>
				)}
				<button
					className="p-2 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-all"
					onClick={toggleCollapse}
				>
					{collapsed ? ">" : "<"}
				</button>
			</div>
			{!collapsed && (
				<>
					<button
						className="w-full py-3 text-white font-semibold rounded-lg shadow-md bg-blue-500 transition-all hover:bg-blue-400 mb-4"
						onClick={startNewChat}
					>
						💬 New Chat
					</button>
					<div className="flex flex-col gap-3 overflow-y-auto flex-1">
						{history.map((chat) => (
							<div
								key={chat.id}
								className={`group p-2 rounded-lg shadow-sm cursor-pointer hover:bg-gray-600 flex justify-between items-center transition-all ${
									chat.id === currentChatId ? "bg-gray-700" : ""
								}`}
								onClick={() => navigateToChat(chat)}
							>
								<span className="font-medium text-gray-200 truncate max-w-[90%]">
									{chat.book}
								</span>
								<button
									className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 transition-opacity duration-200"
									onClick={(e) => {
										e.stopPropagation(); // Prevent navigating to the chat
										deleteChat(chat.id);
									}}
								>
									<FaTrash />
								</button>
							</div>
						))}
					</div>
				</>
			)}
		</div>
	);
}
