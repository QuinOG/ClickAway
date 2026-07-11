import ArmoryScreen from "../features/armory/components/ArmoryScreen.jsx"
import { useArmoryScreenController } from "../features/armory/hooks/useArmoryScreenController.js"

export default function ArmoryPage(props) {
  const controller = useArmoryScreenController(props)

  if (!controller.isReady) {
    return null
  }

  return <ArmoryScreen {...controller} />
}
