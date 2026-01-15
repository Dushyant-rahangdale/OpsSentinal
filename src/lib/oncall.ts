type LayerUser = {
  userId: string;
  user: { name: string; avatarUrl?: string | null; gender?: string | null };
  position: number;
};

type LayerInput = {
  id: string;
  name: string;
  start: Date;
  end: Date | null;
  rotationLengthHours: number;
  users: LayerUser[];
};

type OverrideInput = {
  id: string;
  userId: string;
  user: { name: string; avatarUrl?: string | null; gender?: string | null };
  start: Date;
  end: Date;
  replacesUserId: string | null;
};

export type OnCallBlock = {
  id: string;
  start: Date;
  end: Date;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  userGender?: string | null;
  layerId: string;
  layerName: string;
  source: 'rotation' | 'override';
};

function generateLayerBlocks(layer: LayerInput, windowStart: Date, windowEnd: Date): OnCallBlock[] {
  if (layer.users.length === 0) {
    return [];
  }

  const rotationMs = layer.rotationLengthHours * 60 * 60 * 1000;
  if (rotationMs <= 0) {
    return [];
  }

  const layerStart = layer.start;
  const layerEnd = layer.end ?? null;
  const effectiveWindowStart = windowStart < layerStart ? layerStart : windowStart;
  if (layerEnd && effectiveWindowStart >= layerEnd) {
    return [];
  }

  const startOffsetMs = Math.max(0, effectiveWindowStart.getTime() - layerStart.getTime());
  let index = Math.floor(startOffsetMs / rotationMs);
  let blockStart = new Date(layerStart.getTime() + index * rotationMs);
  if (blockStart > effectiveWindowStart) {
    index = Math.max(0, index - 1);
    blockStart = new Date(layerStart.getTime() + index * rotationMs);
  }

  const blocks: OnCallBlock[] = [];
  let guard = 0;
  // Support up to 1 year of 1-hour rotations (~8760 blocks). 10000 is safe.
  const maxBlocks = 10000;
  while (blockStart < windowEnd) {
    const rawEnd = new Date(blockStart.getTime() + rotationMs);
    const blockEnd = layerEnd && rawEnd > layerEnd ? layerEnd : rawEnd;
    if (blockEnd <= effectiveWindowStart) {
      blockStart = blockEnd;
      index += 1;
      continue;
    }

    const user = layer.users[index % layer.users.length];
    const clampedStart = blockStart < windowStart ? windowStart : blockStart;
    const clampedEnd = blockEnd > windowEnd ? windowEnd : blockEnd;

    if (clampedStart < clampedEnd) {
      blocks.push({
        id: `${layer.id}-${index}`,
        start: clampedStart,
        end: clampedEnd,
        userId: user.userId,
        userName: user.user.name,
        userAvatar: user.user.avatarUrl,
        userGender: user.user.gender,
        layerId: layer.id,
        layerName: layer.name,
        source: 'rotation',
      });
    }

    if (blockEnd >= windowEnd) {
      break;
    }

    blockStart = blockEnd;
    index += 1;
    guard += 1;
    if (guard >= maxBlocks) {
      break;
    }
  }

  return blocks;
}

function applyOverrides(blocks: OnCallBlock[], overrides: OverrideInput[]): OnCallBlock[] {
  const sortedOverrides = [...overrides].sort((a, b) => a.start.getTime() - b.start.getTime());
  let result = [...blocks];

  for (const override of sortedOverrides) {
    const next: OnCallBlock[] = [];
    for (const block of result) {
      if (override.end <= block.start || override.start >= block.end) {
        next.push(block);
        continue;
      }

      if (override.replacesUserId && override.replacesUserId !== block.userId) {
        next.push(block);
        continue;
      }

      const overrideStart = override.start > block.start ? override.start : block.start;
      const overrideEnd = override.end < block.end ? override.end : block.end;

      if (block.start < overrideStart) {
        next.push({ ...block, end: overrideStart });
      }

      next.push({
        ...block,
        id: `${block.id}-override-${override.id}`,
        start: overrideStart,
        end: overrideEnd,
        userId: override.userId,
        userName: override.user.name,
        userAvatar: override.user.avatarUrl,
        userGender: override.user.gender,
        source: 'override',
      });

      if (overrideEnd < block.end) {
        next.push({ ...block, start: overrideEnd });
      }
    }
    result = next;
  }

  return result.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function buildScheduleBlocks(
  layers: LayerInput[],
  overrides: OverrideInput[],
  windowStart: Date,
  windowEnd: Date
) {
  const blocks = layers.flatMap(layer => generateLayerBlocks(layer, windowStart, windowEnd));
  return applyOverrides(blocks, overrides);
}
