import React from "react";

const SuggestedPrompts = ({ prompts, onSendMessage, isLoading }) => {
	return (
		<>
			{!isLoading &&
				prompts.map((prompt, index) => (
					<button
						key={index}
						className="ml-10 md:ml-12 p-2 md:p-3 text-left max-w-[90%] text-white bg-gray-700 rounded-2xl hover:bg-gray-800 transition-all duration-200 ease-in-out shadow-sm border border-gray-200"
						onClick={() => onSendMessage(prompt)}
						disabled={isLoading}
					>
						{prompt}
					</button>
				))}
		</>
	);
};

export default SuggestedPrompts;
