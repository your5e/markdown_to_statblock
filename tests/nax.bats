#!/usr/bin/env bats

## effective duplicates of the your5e styles
@test "convert Goblin" {
    run node test_converter.js tests/nax_dupes/goblin.md
    diff -u tests/yaml/goblin.yaml <(echo "$output")
    [ $status -eq 0 ]
}

@test "convert Hobgoblin" {
    run node test_converter.js tests/nax_dupes/hobgoblin.md
    diff -u tests/yaml/hobgoblin.yaml <(echo "$output")
    [ $status -eq 0 ]
}

@test "convert Wolf" {
    run node test_converter.js tests/nax_dupes/wolf.md
    diff -u tests/yaml/wolf.yaml <(echo "$output")
    [ $status -eq 0 ]
}

@test "convert Aboleth" {
    run node test_converter.js tests/nax_dupes/aboleth.md
    diff -u tests/yaml/aboleth.yaml <(echo "$output")
    [ $status -eq 0 ]
}

@test "convert Ancient Copper Dragon" {
    run node test_converter.js tests/nax_dupes/ancient_copper_dragon.md
    diff -u tests/yaml/ancient_copper_dragon.yaml <(echo "$output")
    [ $status -eq 0 ]
}

## 2024 SRD content
@test "convert 2024 Lich" {
    run node test_converter.js tests/nax/lich.md
    diff -u tests/yaml/2024_lich.yaml <(echo "$output")
    [ $status -eq 0 ]
}
