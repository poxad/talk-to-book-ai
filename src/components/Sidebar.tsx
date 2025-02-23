"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaTrash } from "react-icons/fa"; // Import the trash icon

export default function Sidebar({ onNewChat, book, currentChatId }) {
	const [history, setHistory] = useState([]);
	const [collapsed, setCollapsed] = useState(false);
	const router = useRouter();

	// Load chat history from localStorage when the component mounts
	useEffect(() => {
		const savedHistory =
			JSON.parse(localStorage.getItem("chatHistoryList")) || [];
		setHistory(savedHistory);
	}, []);

	useEffect(() => {
		if (currentChatId && book) {
			setHistory((prevHistory) => {
				// Load the latest history from localStorage
				const savedHistory =
					JSON.parse(localStorage.getItem("chatHistoryList")) || [];

				// Check if the chat already exists in the history
				const chatExists = savedHistory.some(
					(chat) => chat.id === currentChatId
				);

				if (!chatExists) {
					const newChat = {
						id: currentChatId,
						title: `Chat ${savedHistory.length + 1}`,
						book,
					};
					const updatedHistory = [...savedHistory, newChat];
					localStorage.setItem(
						"chatHistoryList",
						JSON.stringify(updatedHistory)
					);
					return updatedHistory;
				}

				return savedHistory; // Ensure we return the correct saved history
			});
		}
	}, [currentChatId, book]);

	const startNewChat = () => {
		router.push(`/`);
	};

	const toggleCollapse = () => {
		setCollapsed((prev) => !prev);
	};

	const navigateToChat = (chat) => {
		router.push(`/chat/${chat.id}?book=${chat.book}`);
	};

	const deleteChat = (chatId) => {
		setHistory((prevHistory) => {
			const updatedHistory = prevHistory.filter((chat) => chat.id !== chatId);
			localStorage.setItem("chatHistoryList", JSON.stringify(updatedHistory));
			return updatedHistory;
		});

		// Clear the chat history for the deleted chat
		localStorage.removeItem(`chatHistory-${chatId}`);
	};

	return (
		<div
			className={`bg-gradient-to-b from-gray-900 to-gray-800 text-white shadow-lg p-4 flex flex-col transition-all duration-300 ${
				collapsed ? "w-16" : "w-1/5"
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
						className="w-full py-3  text-white font-semibold rounded-lg shadow-md bg-blue-500 transition-all hover:bg-blue-400 mb-4"
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
								<span className="font-medium text-gray-200 truncate max-w-[70%]">
									{chat.title} ({chat.book})
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
