export default function MovingButton({ style, onClick, disabled }) {
  return (
    <button className="bigCircleButton" style={style} onClick={onClick} disabled={disabled}>
      Click Here
    </button>
  )
}
