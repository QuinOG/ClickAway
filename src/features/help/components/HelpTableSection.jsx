export default function HelpTableSection({ title, columns, rows, note }) {
  return (
    <section className="helpBlock">
      <h2 className="cardH2">{title}</h2>
      {note ? <p className="muted">{note}</p> : null}
      <table className="table helpTable">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${title}-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <td key={`${title}-${rowIndex}-${cellIndex}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
