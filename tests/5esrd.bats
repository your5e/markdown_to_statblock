#!/usr/bin/env bats

@test "convert Goblin" {
    run node test_converter.js tests/5esrd/goblin.md
    diff -u tests/yaml/goblin.yaml <(echo "$output")
    [ $status -eq 0 ]
}

@test "convert Hobgoblin" {
    run node test_converter.js tests/5esrd/hobgoblin.md
    diff -u tests/yaml/hobgoblin.yaml <(echo "$output")
    [ $status -eq 0 ]
}

@test "convert Wolf" {
    run node test_converter.js tests/5esrd/wolf.md
    diff -u tests/yaml/wolf.yaml <(echo "$output")
    [ $status -eq 0 ]
}

@test "convert Aboleth" {
    run node test_converter.js tests/5esrd/aboleth.md
    diff -u tests/yaml/aboleth.yaml <(echo "$output")
    [ $status -eq 0 ]
}

@test "convert Ancient Copper Dragon" {
    run node test_converter.js tests/5esrd/ancient_copper_dragon.md
    diff -u tests/yaml/ancient_copper_dragon.yaml <(echo "$output")
    [ $status -eq 0 ]
}

@test "convert Lich" {
    run node test_converter.js tests/5esrd/lich.md
    diff -u tests/yaml/lich.yaml <(echo "$output")
    [ $status -eq 0 ]
}
