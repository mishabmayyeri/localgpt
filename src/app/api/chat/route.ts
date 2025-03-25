import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const { messages } = await req.json();

    // Prepare the prompt for Ollama
    const prompt = messages.map((msg: any) =>
        `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`
    ).join('\n\n');

    // Create a new ReadableStream
    const stream = new ReadableStream({
        async start(controller) {
            try {
                // Make request to local Ollama instance with streaming enabled
                const response = await fetch('http://localhost:11434/api/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: 'llama3.1:8b',
                        // model: 'qwen2.5-coder:latest',
                        prompt: prompt + '\n\nAssistant:',
                        stream: true,
                        options: {
                            temperature: 0.7,
                            top_p: 0.9,
                            max_tokens: 2000
                        }
                    }),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Ollama error: ${response.status} - ${errorText}`);
                }

                // Process the streaming response
                const reader = response.body?.getReader();
                if (!reader) {
                    throw new Error('Response body reader is not available');
                }

                const decoder = new TextDecoder();
                let accumulatedResponse = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n').filter(line => line.trim() !== '');

                    for (const line of lines) {
                        try {
                            const parsedLine = JSON.parse(line);
                            if (parsedLine.response) {
                                // Send each token to the client
                                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ token: parsedLine.response })}\n\n`));
                                accumulatedResponse += parsedLine.response;
                            }

                            // If done, send the final message
                            if (parsedLine.done) {
                                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ done: true, fullResponse: accumulatedResponse })}\n\n`));
                            }
                        } catch (e) {
                            console.error('Error parsing streaming response line:', e);
                        }
                    }
                }
            } catch (error) {
                console.error('Streaming error:', error);
                controller.enqueue(
                    new TextEncoder().encode(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`)
                );
            } finally {
                controller.close();
            }
        }
    });

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}