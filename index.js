import { useEffect, useState } from "react";

export default function SurebetDashboard() {
  const [surebets, setSurebets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lucroMinimo, setLucroMinimo] = useState(1.0);

  const API_KEY = process.env.NEXT_PUBLIC_ODDS_API_KEY;
  const API_URL = `https://api.the-odds-api.com/v4/sports/upcoming/odds/?apiKey=${API_KEY}&regions=eu&markets=h2h&oddsFormat=decimal`;

  const calcularSurebet = (odds) => {
    const total = odds.reduce((acc, odd) => acc + (1 / odd), 0);
    return {
      ehSurebet: total < 1,
      lucro: ((1 - total) * 100).toFixed(2),
      margem: total.toFixed(4),
    };
  };

  useEffect(() => {
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => {
        const oportunidades = [];

        data.forEach((jogo) => {
          const oddsPorResultado = { home: [], draw: [], away: [] };

          jogo.bookmakers.forEach((casa) => {
            casa.markets.forEach((mercado) => {
              if (mercado.key === "h2h") {
                mercado.outcomes.forEach((outcome) => {
                  if (outcome.name === jogo.home_team) oddsPorResultado.home.push({ odd: outcome.price, casa: casa.title });
                  if (outcome.name === jogo.away_team) oddsPorResultado.away.push({ odd: outcome.price, casa: casa.title });
                  if (outcome.name === "Draw") oddsPorResultado.draw.push({ odd: outcome.price, casa: casa.title });
                });
              }
            });
          });

          oddsPorResultado.home.forEach((h) => {
            oddsPorResultado.draw.forEach((d) => {
              oddsPorResultado.away.forEach((a) => {
                const { ehSurebet, lucro, margem } = calcularSurebet([h.odd, d.odd, a.odd]);
                if (ehSurebet && parseFloat(lucro) >= lucroMinimo) {
                  oportunidades.push({
                    evento: `${jogo.home_team} vs ${jogo.away_team}`,
                    odds: { A: h.odd, X: d.odd, B: a.odd },
                    casas: { A: h.casa, X: d.casa, B: a.casa },
                    lucro,
                    margem,
                  });
                }
              });
            });
          });
        });

        setSurebets(oportunidades);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erro ao buscar odds:", err);
        setLoading(false);
      });
  }, [lucroMinimo]);

  return (
    <div style={{ padding: 20 }}>
      <h1>Oportunidades de Surebet</h1>
      <div style={{ marginBottom: 10 }}>
        <label>Lucro mínimo desejado (%): </label>
        <input
          type="number"
          step="0.1"
          value={lucroMinimo}
          onChange={(e) => setLucroMinimo(parseFloat(e.target.value))}
        />
      </div>
      {loading && <p>Carregando odds em tempo real...</p>}
      {!loading && surebets.length === 0 && <p>Sem oportunidades encontradas no momento.</p>}
      {surebets.map((s, i) => (
        <div key={i} style={{ border: '1px solid #ccc', padding: 10, marginBottom: 10 }}>
          <p><strong>{s.evento}</strong></p>
          <p>Odds: A ({s.casas.A}) {s.odds.A} | X ({s.casas.X}) {s.odds.X} | B ({s.casas.B}) {s.odds.B}</p>
          <p>Margem: {s.margem} | Lucro: {s.lucro}%</p>
        </div>
      ))}
    </div>
  );
}
