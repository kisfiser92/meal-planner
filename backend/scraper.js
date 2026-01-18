const cheerio = require('cheerio');
const fetch = require('node-fetch');

// Scraper receptů z webu pomocí AI
class RecipeScraper {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  // Stáhne HTML z URL
  async fetchHTML(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      throw new Error(`Chyba při stahování: ${error.message}`);
    }
  }

  // Extrahuje čistý text z HTML
  extractText(html) {
    const $ = cheerio.load(html);
    
    // Odstraň skripty, styly, reklamy
    $('script, style, nav, footer, .ad, .advertisement').remove();
    
    // Vezmi hlavní obsah
    const text = $('body').text()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 15000); // Limit pro API
    
    return text;
  }

  // Použije Claude API pro parsing receptu
  async parseWithAI(text, url) {
    if (!this.apiKey) {
      throw new Error('Claude API klíč není nastaven');
    }

    const prompt = `Z následujícího textu z webové stránky extrahuj recept. Odpověz POUZE validním JSON objektem s touto strukturou:

{
  "name": "název receptu",
  "ingredients": ["ingredience 1", "ingredience 2", ...],
  "instructions": "podrobný postup přípravy"
}

Pokud v textu není recept, odpověz: {"error": "Recept nenalezen"}

Text ze stránky:
${text}`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })
      });

      const data = await response.json();
      const content = data.content[0].text;
      
      // Parse JSON odpovědi
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('AI nevrátila validní JSON');
      
      const recipe = JSON.parse(jsonMatch[0]);
      
      if (recipe.error) {
        throw new Error(recipe.error);
      }

      return {
        name: recipe.name,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        source: url
      };
    } catch (error) {
      throw new Error(`AI parsing selhal: ${error.message}`);
    }
  }

  // Hlavní metoda - zkusí parsovat recept z URL
  async scrapeRecipe(url) {
    const html = await this.fetchHTML(url);
    const text = this.extractText(html);
    return await this.parseWithAI(text, url);
  }
}

module.exports = RecipeScraper;