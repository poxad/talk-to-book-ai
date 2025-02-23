"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import { v4 as uuidv4 } from "uuid";

export default function Home() {
	const [bookName, setBookName] = useState("");
	const router = useRouter();
	const [isEmptyInput, setIsEmptyInput] = useState(false);
	const startChat = () => {
		if (bookName.trim() === "") {
			setIsEmptyInput(true); // Show warning if input is empty
			return; // Stop further execution
		}
		const newChatId = uuidv4();
		router.push(`/chat/${newChatId}?book=${bookName}`);
	};

	return (
		<div className="flex h-screen bg-gradient-to-br from-blue-100 to-white text-gray-900">
			<Sidebar />
			<div className="flex flex-col items-center justify-center flex-1 p-6">
				<div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md text-center">
					<h1 className="text-4xl font-extrabold text-blue-600 mb-6">
						📚 Talk to Book AI
					</h1>
					<p className="text-gray-600 mb-4 text-lg">
						Chat with AI about your favorite books!
					</p>
					<input
						className={`p-3 border ${
							isEmptyInput ? "border-red-500" : "border-gray-300"
						} rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none mb-2 text-gray-800 shadow-sm`}
						type="text"
						value={bookName}
						onChange={(e) => {
							setBookName(e.target.value);
							setIsEmptyInput(false); // Reset warning when user starts typing
						}}
						placeholder="Enter book name or ISBN..."
					/>
					{isEmptyInput && (
						<p className="text-red-500 text-sm mb-4">
							⚠️ Please enter a book name or ISBN.
						</p>
					)}
					<button
						className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all font-semibold shadow-md"
						onClick={startChat}
					>
						🚀 Start Chat
					</button>
				</div>
			</div>
		</div>
	);
}
