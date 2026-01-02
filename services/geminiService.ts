
import { GoogleGenAI, GenerateContentResponse, Chat, Modality } from "@google/genai";
import { Expense } from "../types";

const SYSTEM_INSTRUCTION = `
# PERSONA
Você é o "Bolsolero", um assistente financeiro híbrido: metade Arquiteto de Software Sênior (focado em estruturação de dados e extração de informações) e metade Diretor de Marketing Deboxado (foda-se o politicamente correto, você quer que o usuário pare de ser pobre).

# OBJETIVO PRINCIPAL
Receber inputs bagunçados (texto, áudio transcrito, OCR de fotos ou listas de compras) e transformar isso em objetos JSON estruturados para o banco de dados, enquanto esculacha (com humor) os hábitos de consumo do usuário.

# DIRETRIZES DE ESTILO (MARKETING DEBOXADO)
1. Não use "Olá, como posso ajudar?". Use "Ih, lá vem o gastador" ou "Fala, herdeiro de dívidas".
2. Se o gasto for fútil (Ex: "R$ 200 no OnlyFans" ou "R$ 500 em skin de jogo"), dê um feedback sarcástico.
3. Se o gasto for essencial (Ex: "Aluguel", "Mercado"), seja breve e técnico.
4. Linguagem: PT-BR informal, gírias de dev (bug, deploy, lixo), zero termos de "coach financeiro".

# DIRETRIZES TÉCNICAS (DEV SÊNIOR)
1. Extração: Identifique sempre [VALOR], [CATEGORIA], [ESTABELECIMENTO] e [DATA].
2. Categorização: Se o usuário não disser a categoria, deduza com precisão (Ex: "Ifood" = Alimentação/Delivery).
3. Output de Dados: Sempre que processar um gasto, termine sua resposta com um bloco de código JSON formatado para que um sistema possa capturar.
   Exemplo:
   \`\`\`json
   {
     "amount": 50.00,
     "category": "Lazer",
     "description": "Cerveja artesanal cara",
     "timestamp": "ISO-8601"
   }
   \`\`\`

# FLUXO DE RESPOSTA
1. Comentário Sarcástico: Uma frase curta sobre o gasto.
2. Resumo Técnico: "Registrado: R$ XX em YY".
3. JSON de Integração: O bloco de código para o sistema.
`;

export class GeminiService {
  private getAI() {
    // Inicializa sempre com a chave atual do process.env
    return new GoogleGenAI({ apiKey: (window as any).process?.env?.API_KEY || (process.env.API_KEY as string) });
  }

  private chatInstance: Chat | null = null;

  private getChat() {
    if (!this.chatInstance) {
      const ai = this.getAI();
      this.chatInstance = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      });
    }
    return this.chatInstance;
  }

  async sendMessage(message: string, imageBase64?: string, audioBase64?: string): Promise<{ text: string; expense?: Expense }> {
    const ai = this.getAI();
    const chat = this.getChat();
    let result: GenerateContentResponse;

    try {
      if (imageBase64 || audioBase64) {
        const parts: any[] = [{ text: message || "Analise este gasto." }];
        
        if (imageBase64) {
          parts.push({ inlineData: { data: imageBase64.split(',')[1], mimeType: 'image/jpeg' } });
        }
        
        if (audioBase64) {
          // Nota: 'audio/pcm;rate=16000' é o sugerido para Live, mas para Content API o webm/mp3 costuma funcionar bem se base64 for válido
          parts.push({ inlineData: { data: audioBase64.split(',')[1], mimeType: 'audio/webm' } });
        }

        result = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [{ role: 'user', parts }],
          config: { systemInstruction: SYSTEM_INSTRUCTION }
        });
      } else {
        result = await chat.sendMessage({ message });
      }

      const responseText = result.text || "";
      const expense = this.extractJSON(responseText);

      return { text: responseText, expense };
    } catch (error) {
      console.error("Erro na API Gemini:", error);
      throw error;
    }
  }

  async generateSpeech(text: string): Promise<string | undefined> {
    try {
      const ai = this.getAI();
      const speechText = text.split('```json')[0].trim();
      if (!speechText) return undefined;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Diga com deboche extremo: ${speechText}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Puck' },
            },
          },
        },
      });

      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (e) {
      console.error("Erro ao gerar fala:", e);
      return undefined;
    }
  }

  private extractJSON(text: string): Expense | undefined {
    try {
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        const parsed = JSON.parse(jsonMatch[1]);
        return {
          id: Math.random().toString(36).substr(2, 9),
          amount: parseFloat(parsed.amount || parsed.valor || 0),
          category: parsed.category || parsed.categoria || 'Outros',
          sub_category: parsed.sub_category,
          description: parsed.description || parsed.estabelecimento || 'Gasto registrado',
          timestamp: parsed.timestamp || new Date().toISOString()
        };
      }
    } catch (e) {
      // Ignora erro de parsing se não houver JSON
    }
    return undefined;
  }
}

export const geminiService = new GeminiService();
