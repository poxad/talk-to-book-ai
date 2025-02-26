import React from "react";

const LoadingIndicator = () => {
	return (
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
	);
};

export default LoadingIndicator;
