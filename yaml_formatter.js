function needs_quotes(str) {
    return str.includes(':') || str.includes('\n') || str.includes('#') ||
           str.includes('[') || str.includes(']') || str.match(/^[\d-]/);
}

function format_yaml_value(value) {
    if (needs_quotes(value)) {
        return (
            '"' +
            value.replace(/\\/g, '\\\\')
                .replace(/"/g, '\\"')
                .replace(/\n/g, '\\n') +
            '"'
        );
    }
    return value;
}

function generate_key_value_array_yaml(key, array) {
    if (!array || array.length === 0) return '';

    let yaml = `${key}:\n`;
    for (const item of array) {
        const entries = Object.entries(item);
        const [first_key, first_value] = entries[0];
        yaml += `  - ${first_key}: ${first_value}\n`;
        for (let i = 1; i < entries.length; i++) {
            const [key, value] = entries[i];
            yaml += `    ${key}: ${value}\n`;
        }
    }
    return yaml;
}

function generate_abilities_yaml(key, abilities) {
    if (!abilities || abilities.length === 0) return '';

    let yaml = `${key}:\n`;
    for (const ability of abilities) {
        yaml += `  - name: ${ability.name}\n`;
        yaml += `    desc: ${format_yaml_value(ability.desc)}\n`;
        if (ability.attack_bonus !== 0) {
            yaml += `    attack_bonus: ${ability.attack_bonus}\n`;
        }
        if (ability.damage_dice) {
            yaml += `    damage_dice: "${ability.damage_dice}"\n`;
        }
        if (ability.damage_bonus !== undefined) {
            yaml += `    damage_bonus: ${ability.damage_bonus}\n`;
        }
    }
    return yaml;
}

function generate_spellcasting_yaml(key, spellcasting) {
    if (!spellcasting || spellcasting.length === 0) return '';

    let yaml = `${key}:\n`;
    for (const line of spellcasting) {
        yaml += `  - ${line}\n`;
    }
    return yaml;
}

function generate_yaml(monster) {
    let yaml = '';

    if (monster.source) yaml += `source: ${monster.source}\n`;
    if (monster.name) yaml += `name: ${monster.name}\n`;
    if (monster.size) yaml += `size: ${monster.size}\n`;
    if (monster.type) yaml += `type: ${monster.type}\n`;
    if (monster.subtype) yaml += `subtype: ${monster.subtype}\n`;
    if (monster.alignment) yaml += `alignment: ${monster.alignment}\n`;
    if (monster.ac) yaml += `ac: ${monster.ac}\n`;
    if (monster.hp) yaml += `hp: ${monster.hp}\n`;
    if (monster.hit_dice) yaml += `hit_dice: "${monster.hit_dice}"\n`;
    if (monster.speed) yaml += `speed: "${monster.speed}"\n`;

    if (monster.stats) {
        yaml += `stats: [${monster.stats.join(', ')}]\n`;
    }

    yaml += generate_key_value_array_yaml('saves', monster.saves);
    yaml += generate_key_value_array_yaml('skillsaves', monster.skillsaves);

    if (monster.damage_resistances) {
        yaml += `damage_resistances: ${monster.damage_resistances}\n`;
    }
    if (monster.damage_immunities) {
        yaml += `damage_immunities: ${monster.damage_immunities}\n`;
    }
    if (monster.condition_immunities) {
        yaml += `condition_immunities: ${monster.condition_immunities}\n`;
    }
    if (monster.senses) yaml += `senses: ${monster.senses}\n`;
    if (monster.languages && monster.languages !== '—' && monster.languages !== 'None') {
        yaml += `languages: ${monster.languages}\n`;
    }
    if (monster.cr) yaml += `cr: "${monster.cr}"\n`;
    if (monster.bestiary) yaml += 'bestiary: true\n';

    yaml += generate_abilities_yaml('traits', monster.traits);
    yaml += generate_abilities_yaml('actions', monster.actions);
    yaml += generate_abilities_yaml('bonus_actions', monster.bonus_actions);
    yaml += generate_abilities_yaml('reactions', monster.reactions);
    yaml += generate_abilities_yaml('legendary_actions', monster.legendary_actions);
    yaml += generate_spellcasting_yaml('spells', monster.spells);

    return yaml;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generate_yaml };
}
