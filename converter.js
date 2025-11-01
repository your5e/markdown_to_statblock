if (
    typeof module !== 'undefined' &&
    typeof require !== 'undefined' &&
    typeof generate_yaml === 'undefined'
) {
    generate_yaml = require('./yaml_formatter.js').generate_yaml;
}

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const input_el = document.getElementById('markdown');
        const output_el = document.getElementById('yaml');
        const copy_button = document.getElementById('copy-yaml');

        let debounce_timer;
        input_el.addEventListener('input', () => {
            clearTimeout(debounce_timer);
            debounce_timer = setTimeout(() => {
                const markdown = input_el.value;
                const yaml = convert_markdown_to_yaml(markdown);
                output_el.value = yaml;
            }, 1000);
        });

        copy_button.addEventListener('click', () => {
            const yaml = output_el.value;
            if (yaml) {
                navigator.clipboard.writeText(yaml).then(() => {
                    const original_text = copy_button.textContent;
                    copy_button.textContent = 'Copied!';
                    setTimeout(() => {
                        copy_button.textContent = original_text;
                    }, 2000);
                });
            }
        });
    });
}

function convert_markdown_to_yaml(markdown) {
    if (!markdown.trim()) {
        return '';
    }

    markdown = markdown.replace(/\u00A0/g, ' ');

    try {
        const monster = parse_markdown(markdown);
        return generate_yaml(monster);
    } catch (error) {
        return `Error: ${error.message}`;
    }
}

function process_wikilinks(text) {
    return text.replace(/\[\[([^\]]+)\]\]/g, (_, content) => {
        if (content.includes('|')) {
            content = content.split('|')[1];
        }
        const words = content.split(' ');
        if (words.length === 1) {
            return content.toLowerCase();
        }
        return words[0].toLowerCase() + ' ' + words.slice(1).join(' ');
    });
}

function parse_list_item(key, value, monster) {
    if (key === 'Armor Class') {
        const ac_match = value.match(/^(\d+)/);
        if (ac_match) monster.ac = parseInt(ac_match[1]);
    } else if (key === 'Hit Points') {
        const hp_match = value.match(/^(\d+)\s*\(([^)]+)\)/);
        if (hp_match) {
            monster.hp = parseInt(hp_match[1]);
            monster.hit_dice = hp_match[2];
        }
    } else if (key === 'Speed') {
        monster.speed = value;
    } else if (key === 'Skills') {
        monster.skillsaves = parse_skills(value);
    } else if (key === 'Damage Resistances' || key === 'Resistances') {
        monster.damage_resistances = value.toLowerCase();
    } else if (key === 'Damage Immunities' || key === 'Immunities') {
        monster.damage_immunities = value.toLowerCase();
    } else if (key === 'Condition Immunities') {
        monster.condition_immunities = value;
    } else if (key === 'Senses') {
        monster.senses = value.replace(/;/g, ',');
    } else if (key === 'Languages') {
        monster.languages = value.replace(/;/g, ',');
    } else if (key === 'Challenge') {
        const cr_match = value.match(/^([^\s(]+)/);
        if (cr_match) monster.cr = cr_match[1];
    }
}

function parse_vertical_stat_row(
    line, stat1_name, stat1_index, stat2_name, stat2_index, monster
) {
    const pattern = new RegExp(
        `\\|\\s*\\*\\*${stat1_name}\\*\\*\\s*\\|\\s*(\\d+)\\s*\\|` +
        `\\s*[+-]?\\d+\\s*\\|\\s*([+-]?\\d+)\\s*\\|` +
        `\\s*\\*\\*${stat2_name}\\*\\*\\s*\\|\\s*(\\d+)\\s*\\|` +
        `\\s*[+-]?\\d+\\s*\\|\\s*([+-]?\\d+)\\s*\\|`
    );
    const stat_match = line.match(pattern);
    if (stat_match) {
        monster.stats[stat1_index] = parseInt(stat_match[1]);
        monster.stats[stat2_index] = parseInt(stat_match[3]);
        const save1 = parseInt(stat_match[2]);
        const save2 = parseInt(stat_match[4]);
        const mod1 = Math.floor((monster.stats[stat1_index] - 10) / 2);
        const mod2 = Math.floor((monster.stats[stat2_index] - 10) / 2);
        const ability_names = {
            STR: 'strength', DEX: 'dexterity', CON: 'constitution',
            INT: 'intelligence', WIS: 'wisdom', CHA: 'charisma'
        };
        if (save1 !== mod1) {
            monster.tempSaves[ability_names[stat1_name]] = save1;
        }
        if (save2 !== mod2) {
            monster.tempSaves[ability_names[stat2_name]] = save2;
        }
    }
}

function collect_multi_line_entry(lines, start_index, current_section) {
    let parts = [];
    let current_part = lines[start_index].trim();
    let current_is_bullet = false;
    let j = start_index + 1;

    while (j < lines.length) {
        const next_line = lines[j].trim();
        if (
            next_line.startsWith('##') ||
            next_line.startsWith('_**') ||
            next_line.startsWith('***')
        ) {
            break;
        }
        if (
            next_line.startsWith('- **') &&
            current_section === 'legendary actions'
        ) {
            break;
        }
        if (next_line) {
            if (next_line.startsWith('-')) {
                if (current_part) {
                    parts.push({
                        text: current_part,
                        isBullet: current_is_bullet
                    });
                }
                current_part = next_line;
                current_is_bullet = true;
            } else {
                if (current_part) {
                    current_part += ' ' + next_line;
                } else {
                    current_part = next_line;
                }
            }
        } else {
            if (current_part) {
                parts.push({ text: current_part, isBullet: current_is_bullet });
                current_part = '';
                current_is_bullet = false;
            }
        }
        j++;
    }
    if (current_part) {
        parts.push({ text: current_part, isBullet: current_is_bullet });
    }

    const full_text = join_text_parts(parts);
    return { fullText: full_text, nextIndex: j };
}

function join_text_parts(parts) {
    let result = '';
    for (let k = 0; k < parts.length; k++) {
        if (k > 0) {
            if (parts[k].isBullet || parts[k-1].isBullet) {
                result += '\n';
            } else {
                result += '\n\n';
            }
        }
        result += parts[k].text;
    }
    return result;
}

function filter_checkbox_blocks(lines) {
    const filtered = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i].trim();
        if (line.startsWith('[!checks')) {
            i++;
            while (
                i < lines.length &&
                (
                    lines[i].trim() === '-' ||
                    lines[i].trim().startsWith('- [ ]')
                )
            ) {
                i++;
            }
        } else {
            filtered.push(lines[i]);
            i++;
        }
    }
    return filtered;
}

function parse_markdown(markdown) {
    let lines = markdown.split('\n').map(line => line.replace(/^>\s?/, ''));
    lines = filter_checkbox_blocks(lines);
    const monster = {
        bestiary: true
    };

    let current_section = null;
    let i = 0;

    while (i < lines.length) {
        const line = lines[i].trim();

        if (line.startsWith('# ')) {
            monster.name = line.substring(2).trim();
        }

        else if (line.match(/^[*_].*[*_]$/) && !current_section) {
            const text = line.substring(1, line.length - 1);
            const match = text.match(/^(\w+)\s+(\w+)\s*(?:\(([^)]+)\))?,?\s*(.+)$/);
            if (match) {
                monster.size = match[1];
                monster.type = match[2].toLowerCase();
                monster.subtype = match[3] || '';
                monster.alignment = match[4].toLowerCase();
            }
        }

        else if (line.match(/^\*\*[A-Z]/) && !current_section) {
            const match = line.match(/^\*\*([^*]+)\*\*\s+(.+)$/);
            if (match) {
                const key = match[1];
                const value = process_wikilinks(match[2]);
                if (key === 'AC') {
                    parse_list_item('Armor Class', value, monster);
                } else if (key === 'HP') {
                    parse_list_item('Hit Points', value, monster);
                } else if (key === 'Speed') {
                    parse_list_item('Speed', value, monster);
                } else if (key === 'Skills') {
                    parse_list_item('Skills', value, monster);
                } else if (key === 'Resistances') {
                    parse_list_item('Resistances', value, monster);
                } else if (key === 'Immunities') {
                    parse_list_item('Immunities', value, monster);
                } else if (key === 'Senses') {
                    parse_list_item('Senses', value, monster);
                } else if (key === 'Languages') {
                    parse_list_item('Languages', value, monster);
                } else if (key === 'CR') {
                    parse_list_item('Challenge', value, monster);
                }
            }
        }

        else if (line.startsWith('- **') && !current_section) {
            const match = line.match(/^- \*\*([^*]+)\*\*\s+(.+)$/);
            if (match) {
                const key = match[1];
                const value = process_wikilinks(match[2]);
                parse_list_item(key, value, monster);
            }
        }

        else if (line.includes('| **Score**')) {
            const pattern = (
                '\\|\\s*(-?\\d+)\\s*\\|\\s*(-?\\d+)\\s*\\|' +
                '\\s*(-?\\d+)\\s*\\|\\s*(-?\\d+)\\s*\\|' +
                '\\s*(-?\\d+)\\s*\\|\\s*(-?\\d+)\\s*\\|'
            );
            const stat_match = line.match(new RegExp(pattern));
            if (stat_match) {
                monster.stats = [
                    parseInt(stat_match[1]),
                    parseInt(stat_match[2]),
                    parseInt(stat_match[3]),
                    parseInt(stat_match[4]),
                    parseInt(stat_match[5]),
                    parseInt(stat_match[6])
                ];
            }
        }

        else if (line.match(/\|\s*\*\*STR\*\*/)) {
            if (!monster.stats) {
                monster.stats = [0, 0, 0, 0, 0, 0];
                monster.tempSaves = {};
            }
            parse_vertical_stat_row(
                line, 'STR', 0, 'INT', 3, monster
            );
        }

        else if (line.match(/\|\s*\*\*DEX\*\*/)) {
            parse_vertical_stat_row(
                line, 'DEX', 1, 'WIS', 4, monster
            );
        }

        else if (line.match(/\|\s*\*\*CON\*\*/)) {
            parse_vertical_stat_row(
                line, 'CON', 2, 'CHA', 5, monster
            );
            monster.saves = build_saves_array(monster.tempSaves);
            delete monster.tempSaves;
        }

        else if (line.includes('| **Saving Throw**')) {
            const pattern = (
                '\\|\\s*([+-]?\\d+)\\s*\\|\\s*([+-]?\\d+)\\s*\\|' +
                '\\s*([+-]?\\d+)\\s*\\|\\s*([+-]?\\d+)\\s*\\|' +
                '\\s*([+-]?\\d+)\\s*\\|\\s*([+-]?\\d+)\\s*\\|'
            );
            const save_match = line.match(new RegExp(pattern));
            if (save_match) {
                const abilities = [
                    'strength', 'dexterity', 'constitution',
                    'intelligence', 'wisdom', 'charisma'
                ];
                const stats = monster.stats || [10, 10, 10, 10, 10, 10];
                const temp_saves = {};

                for (let j = 0; j < 6; j++) {
                    const save_bonus = parseInt(save_match[j + 1]);
                    const stat_modifier = Math.floor((stats[j] - 10) / 2);
                    if (save_bonus !== stat_modifier) {
                        temp_saves[abilities[j]] = save_bonus;
                    }
                }

                monster.saves = build_saves_array(temp_saves);
            }
        }

        else if (line.startsWith('### ') || line.startsWith('## ')) {
            current_section = line.startsWith('### ')
                ? line.substring(4).trim().toLowerCase()
                : line.substring(3).trim().toLowerCase();
            if (current_section === 'traits') {
                monster.traits = [];
            } else if (current_section === 'actions') {
                monster.actions = [];
            } else if (current_section === 'bonus actions') {
                monster.bonus_actions = [];
            } else if (current_section === 'reactions') {
                monster.reactions = [];
            } else if (current_section === 'legendary actions') {
                monster.legendary_actions = [];
            }
        }

        else if (
            (line.startsWith('_**') || line.startsWith('***')) &&
            current_section
        ) {
            const result = collect_multi_line_entry(lines, i, current_section);
            const entry = parse_ability_entry(result.fullText);
            if (entry) {
                if (entry.name === 'Spellcasting') {
                    monster.spells = parse_spellcasting(entry.desc);
                }
                if (current_section === 'traits') {
                    if (entry.name !== 'Spellcasting') {
                        monster.traits.push(entry);
                    }
                } else if (current_section === 'actions') {
                    monster.actions.push(entry);
                } else if (current_section === 'bonus actions') {
                    monster.bonus_actions.push(entry);
                } else if (current_section === 'reactions') {
                    monster.reactions.push(entry);
                } else if (current_section === 'legendary actions') {
                    monster.legendary_actions.push(entry);
                }
            }
            i = result.nextIndex - 1;
        }

        else if (
            line.startsWith('- **') &&
            current_section === 'legendary actions'
        ) {
            const entry = parse_bullet_ability_entry(line);
            if (entry) {
                monster.legendary_actions.push(entry);
            }
        }

        i++;
    }

    return monster;
}

function parse_skills(skill_text) {
    const skills = [];
    const parts = skill_text.split(',');

    for (const part of parts) {
        const clean_part = part.trim().replace(/\[\[([^\]]+)\]\]/g, '$1');
        const match = clean_part.match(/^(\w+)\s+([+-]?\d+)$/);
        if (match) {
            const skill_name = match[1].toLowerCase();
            const bonus = parseInt(match[2]);
            const skill = {};
            skill[skill_name] = bonus;
            skills.push(skill);
        }
    }

    return skills;
}

function build_saves_array(temp_saves) {
    const abilities = [
        'strength', 'dexterity', 'constitution',
        'intelligence', 'wisdom', 'charisma'
    ];
    const saves = [];
    for (const ability of abilities) {
        if (temp_saves[ability] !== undefined) {
            const save = {};
            save[ability] = temp_saves[ability];
            saves.push(save);
        }
    }
    return saves;
}

function parse_ability_entry(line) {
    let name_match = line.match(/^_\*\*([^*]+)\.\*\*_\s*([\s\S]+)$/);
    if (!name_match) {
        name_match = line.match(/^_\*\*([^*]+)\.\*\*\s+([\s\S]+)$/);
    }
    if (!name_match) {
        name_match = line.match(/^\*\*\*([^*]+)\.\*\*\*\s*([\s\S]+)$/);
    }
    if (!name_match) {
        name_match = line.match(/^\*\*\*([^*]+)\*\*\*\.\s*([\s\S]+)$/);
    }
    if (!name_match) return null;

    const name = name_match[1];
    let desc = name_match[2];

    desc = desc.replace(/^_|_$/g, '');
    desc = desc.replace(/_\*\*([^*]+)\*\*_/g, '$1');
    desc = desc.replace(/_/g, '');
    desc = desc.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '$1');
    desc = desc.replace(/\[\[([^\]]+)\]\]/g, (_, content) => {
        if (content.includes('|')) {
            return content.split('|')[1];
        }
        return content;
    });

    return parse_ability_fields(name, desc);
}

function parse_bullet_ability_entry(line) {
    const name_match = line.match(/^-\s+\*\*([^*]+)\.\*\*\s+(.+)$/);
    if (!name_match) return null;

    let desc = name_match[2];
    desc = desc.replace(/\[\[([^\]]+)\]\]/g, (_, content) => {
        if (content.includes('|')) {
            return content.split('|')[1];
        }
        return content;
    });

    return parse_ability_fields(name_match[1], desc);
}

function parse_ability_fields(name, desc) {
    const entry = { name, desc, attack_bonus: 0 };

    let attack_match = desc.match(/Attack Roll:\s*([+-]\d+)/);
    if (!attack_match) {
        attack_match = desc.match(/([+-]\d+)\s+to\s+hit/);
    }
    if (attack_match) {
        entry.attack_bonus = parseInt(attack_match[1]);
    }

    const damage_match = desc.match(/\((\d+d\d+)\s*([+-]\s*\d+)?\)/);
    if (damage_match) {
        entry.damage_dice = damage_match[1];
        if (damage_match[2]) {
            const bonus = damage_match[2].replace(/\s/g, '');
            entry.damage_bonus = parseInt(bonus);
        }
    }

    return entry;
}

function parse_spellcasting(desc) {
    const lines = desc.split('\n');
    return lines
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
            line = line.replace(/^-\s*/, '');
            line = line.replace(/\*\*/g, '');
            line = line.replace(/\s+/g, ' ');
            return line.replace(/\[\[([^\]]+)\]\]/g, (_, content) => {
                if (content.includes('|')) {
                    return content.split('|')[1];
                }
                return content;
            });
        });
}


// For Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { convert_markdown_to_yaml };
}
