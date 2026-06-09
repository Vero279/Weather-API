# 🌍 European Weather Dashboard

**Projeto 3 — Dashboard Meteorológico com API e p5.js**
Unidade curricular: Edições Multimédia Interativas · LEM 3 · ISTEC Porto · 2025/2026

---

## Descrição

Dashboard de dados meteorológicos em tempo real para 7 cidades europeias, visualizado como arte de dados interativa. As previsões para 7 dias são apresentadas em cubos 3D rotativos que codificam temperatura, qualidade do ar, humidade e vento. Os dados são obtidos diretamente da API Open-Meteo, sem necessidade de chave de API.

## Demo

🔗 [vero279.github.io/Weather-API](https://vero279.github.io/Weather-API/)

## Funcionalidades

- Previsão de **7 dias** para **7 cidades europeias**
- Visualização de: temperatura · qualidade do ar · humidade · vento
- Cubos 3D com rotação automática a cada 2 segundos
- Dados ao vivo via [Open-Meteo](https://open-meteo.com/) (API gratuita, sem registo)
- Interface responsiva

## API Utilizada

| Propriedade | Detalhe |
|---|---|
| Fonte | [Open-Meteo](https://open-meteo.com/) |
| Autenticação | Nenhuma (API pública e gratuita) |
| Dados | Temperatura, humidade, vento, qualidade do ar |
| Frequência | Atualização em tempo real a cada carregamento |

## Tecnologias

| Tecnologia | Função |
|---|---|
| p5.js | Renderização gráfica e animação dos cubos |
| Fetch API | Consumo da API Open-Meteo |
| HTML5 | Estrutura da página |
| CSS3 | Estilização do dashboard |
| JavaScript | Lógica de dados e interações |

## Estrutura do Repositório

```
Weather-API/
├── index.html    # Estrutura da aplicação
├── sketch.js     # Lógica principal — fetch de dados e renderização p5.js
├── style.css     # Estilos do dashboard
└── README.md
```

## Como Executar Localmente

```bash
git clone https://github.com/Vero279/Weather-API.git
cd Weather-API
# Abrir index.html num servidor local (ex: Live Server no VS Code)
```

> **Nota:** O fetch à API requer ligação à internet. Servir o ficheiro localmente via servidor HTTP para evitar problemas de CORS.

## Autora

**Verónica Couto** · veronica.couto.2022279@my.istec.pt
