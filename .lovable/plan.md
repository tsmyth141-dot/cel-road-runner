# Bartender Character Upgrade

## Goal
Replace the basic block-person bartender with a distinctive, readable opening character that fits the bold cel-shaded street-art style.

## Changes
- Build a dedicated bartender model with a stronger silhouette, layered clothing, facial features, hair, apron, accessories, and heavier ink outlines.
- Give the bartender a grounded idle pose and subtle character animation rather than the shared bouncing NPC motion.
- Keep the existing position and cutscene framing, adjusting only where needed so the upgraded character reads clearly.
- Preserve Chromebook performance by using compact shared geometry and simple cel-shaded materials.
- Verify the opening cutscene visually and confirm the game remains error-free.

## Technical details
- Add a bartender-specific procedural builder instead of changing every generic pedestrian.
- Use nested groups for shoulders, arms, head, and accessories so proportions and pose remain controllable.
- Keep geometry low-poly and reuse the current toon ramp and outline materials.
