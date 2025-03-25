# LocalGPT - Next.js + Ollama LLM Integration

This project is a Next.js application that integrates with open-source Large Language Models (LLMs) using Ollama. It allows users to run the application locally with any LLMs they have installed on their machine.

## Features
- Supports locally hosted open-source LLMs via Ollama
- Chat UI for seamless interaction with the model
- Simple Next.js API for interacting with models
- Configurable model selection (currently set programmatically in the code)

## Prerequisites
Before you begin, ensure you have the following installed on your system:
- **Node.js** (>= 18)
- **npm** or **yarn**
- **Ollama** (Follow the installation instructions: [Ollama Website](https://ollama.ai/))
- At least one LLM installed locally (e.g., `gemma`, `mistral`, etc.)

## Installation

1. Clone this repository:
   ```sh
   git clone https://github.com/mishabmayyeri/localgpt.git
   cd localgpt
   ```
2. Install dependencies:
   ```sh
   npm install  # or yarn install
   ```
3. Start the development server:
   ```sh
   npm run dev  # or yarn dev
   ```

## Configuration

Currently, the model name is hardcoded in the code. To change the model, locate the API handler file `app/api/chat/route.ts` in your Next.js app and update the model name:

```javascript
 model: 'llama3.1:8b', // Change this to your installed model name, you can check it by running ollama list which will list all your installed models
```

In future versions, a UI-based selection or environment variable configuration may be added.

## Usage
1. Ensure Ollama is running and your preferred model is installed. You can check installed models with:
   ```sh
   ollama list
   ```
2. Start the Next.js server and access the application at `http://localhost:3000`.
3. The chat UI will load automatically, allowing you to interact with the model directly.
4. You can also send a request to the API endpoint (`/api/chat`) with a prompt to interact with the model programmatically.

## Contributing
Feel free to contribute by submitting issues or pull requests!

## License
This project is licensed under the MIT License.

---
### Notes
- Future improvements may include UI-based model selection and environment variable-based configuration.
- If you encounter issues, ensure that Ollama is running and the model is correctly installed.

Happy coding! 🚀
















# LocalGPT - Next.js + Ollama LLM Integration

This project is a Next.js application that integrates with open-source Large Language Models (LLMs) using Ollama. It allows users to run the application locally with any LLMs they have installed on their machine.

## Features
- Supports locally hosted open-source LLMs via Ollama
- Simple Next.js API for interacting with models
- Configurable model selection (currently set programmatically in the code)

## Prerequisites
Before you begin, ensure you have the following installed on your system:
- **Node.js** (>= 18)
- **npm** or **yarn**
- **Ollama** (Follow the installation instructions: [Ollama Website](https://ollama.ai/))
- At least one LLM installed locally (e.g., `gemma`, `mistral`, etc.)

## Installation

1. Clone this repository:
   ```sh
   git clone https://github.com/yourusername/localgpt.git
   cd localgpt
   ```
2. Install dependencies:
   ```sh
   npm install  # or yarn install
   ```
3. Start the development server:
   ```sh
   npm run dev  # or yarn dev
   ```

## Configuration

Currently, the model name is hardcoded in the code. To change the model, locate the API handler file `app/api/chat/route.ts` in your Next.js app and update the model name:

```javascript
 model: 'llama3.1:8b', // Change this to your installed model name, you can check it by running ollama list which will list all your installed models
```

In future versions, a UI-based selection or environment variable configuration may be added.

## Usage
1. Ensure Ollama is running and your preferred model is installed. You can check installed models with:
   ```sh
   ollama list
   ```
2. Start the Next.js server and access the application at `http://localhost:3000`.
3. Send a request to the API endpoint (`/api/chat`) with a prompt to interact with the model.

## Contributing
Feel free to contribute by submitting issues or pull requests!

## License
This project is licensed under the MIT License.

---
### Notes
- Future improvements may include UI-based model selection and environment variable-based configuration.
- If you encounter issues, ensure that Ollama is running and the model is correctly installed.

Happy coding! 🚀

