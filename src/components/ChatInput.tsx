import React, { useState } from "react";
import { FaPaperPlane } from "react-icons/fa";

const ChatInput = ({ input, setInput, onSendMessage, isLoading }) => {
	return (
		<div className="w-full md:w-3/4 flex gap-2 p-2 md:p-4 bg-gray-700 rounded-2xl shadow-lg sticky bottom-0">
			<input
				className="flex-1 p-2 md:p-3 rounded-2xl bg-gray-800 text-white focus:ring-2 focus:ring-blue-500 outline-none shadow-sm text-sm md:text-base"
				type="text"
				value={input}
				onChange={(e) => setInput(e.target.value)}
				onKeyPress={(e) => e.key === "Enter" && onSendMessage()}
				placeholder="Type a message..."
				disabled={isLoading}
			/>
			<button
				className="flex items-center justify-center p-2 md:p-3 bg-gray-500 text-white rounded-2xl hover:bg-gray-600 transition-all shadow-md w-10 md:w-12"
				onClick={onSendMessage}
				disabled={isLoading}
			>
				<FaPaperPlane className="w-4 h-4 md:w-5 md:h-5" />
			</button>
		</div>
	);
};

export default ChatInput;
