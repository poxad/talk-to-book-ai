// pages/index.js
import React from "react";
import ReactMarkdown from "react-markdown";
// import "github-markdown-css";
// import remarkGfm from "remark-gfm";
const responseText = `
# Oral and Maxillofacial Pathology

**"Oral and Maxillofacial Pathology"** covers a wide range of diseases affecting the oral cavity and maxillofacial region, including oral cancer.

## 📘 Recent Advancements in Oral Cancer Diagnosis

- **Molecular Markers:**
  - **p53:** A tumor suppressor gene often mutated in oral cancer.
  - **EGFR:** A receptor tyrosine kinase frequently overexpressed.

- **Advanced Imaging Techniques:**
  - **PET/CT scans:** Detect metabolically active cancer cells.
  - **MRI:** Visualize soft tissue structures, including tumors.

- **Liquid Biopsies:** Analyzing blood or saliva for circulating tumor DNA (ctDNA).

- **Artificial Intelligence (AI):** AI-assisted image analysis to detect subtle changes in radiographs or histopathology slides.

## 🧠 Conclusion

This textbook remains an invaluable resource for understanding oral pathology and keeping up with evolving diagnostic techniques.
`;

const HomePage = () => {
	return (
		<div className="container">
			<h1>Book Information</h1>
			<div>
				<ReactMarkdown className="markdown-content">{responseText}</ReactMarkdown>
			</div>
		</div>
	);
};

export default HomePage;
