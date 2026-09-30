---
slug: "java-hashmap-internals"
title: "Java HashMap의 hashCode, equals, 충돌과 resize"
description: "HashMap의 키 비교, 충돌 처리와 확장 비용을 예제로 따라갑니다."
publishedAt: "2026-05-01"
updatedAt: "2026-09-30"
category: "Java·CS"
tags: ["Java","CS","Collections"]
draft: false
---

## Java HashMap 동작 원리 정리: hashCode, equals, 충돌, resize까지

Java에서 `HashMap`은 정말 자주 사용하는 자료구조다.

```java
Map<String, Integer> map = new HashMap<>();

map.put("apple", 100);
map.put("banana", 200);

System.out.println(map.get("apple")); // 100
```

겉으로 보면 단순히 Key를 넣고 Value를 꺼내는 구조처럼 보인다.

하지만 내부적으로는 다음 개념들이 함께 동작한다.

```text
배열
해시 함수
해시 충돌
equals / hashCode
resize
```

이번 글에서는 Java `HashMap`이 어떻게 평균적으로 `O(1)`의 성능을 낼 수 있는지 정리해보려고 한다.

## 1. HashMap이란?

`HashMap`은 데이터를 `Key-Value` 형태로 저장하는 자료구조다.

```java
map.put("apple", 100);
```

여기서 `"apple"`은 Key이고, `100`은 Value다.

값을 조회할 때는 Value를 직접 찾는 것이 아니라, Key를 이용해서 Value를 찾는다.

```java
map.get("apple"); // 100
```

즉, `HashMap`은 다음과 같은 구조를 가진다.

```text
Key   -> Value
apple -> 100
banana -> 200
```

## 2. HashMap의 내부 구조

`HashMap`은 내부적으로 배열을 사용한다.

이 배열의 각 칸을 보통 **bucket**이라고 부른다.

```text
bucket array

index 0 ->
index 1 ->
index 2 ->
index 3 ->
...
```

HashMap은 Key를 그대로 배열에 넣는 것이 아니라, Key의 `hashCode()`를 이용해서 어느 bucket에 저장할지 결정한다.

흐름을 단순화하면 다음과 같다.

```text
Key
 -> hashCode()
 -> hash 값 계산
 -> bucket index 계산
 -> 해당 bucket에 저장
```

예를 들어 `"apple"`이라는 Key가 들어오면, HashMap은 `"apple"`의 hashCode를 구하고, 그 값을 이용해 내부 배열의 특정 index를 계산한다.

```text
"apple".hashCode()
 -> hash 값
 -> index 계산
 -> bucket에 저장
```

## 3. 해시 함수란?

해시 함수는 데이터를 특정 정수 값으로 변환하는 함수다.

Java에서는 객체의 `hashCode()` 메서드가 이 역할을 한다.

```java
int hash = key.hashCode();
```

이 hash 값을 이용해서 HashMap 내부 배열의 index를 계산한다.

개념적으로는 이렇게 생각할 수 있다.

```text
index = hash % capacity
```

여기서 `capacity`는 내부 배열의 크기다.

예를 들어 배열 크기가 16이고, hash 값이 35라면 다음과 같이 index를 구할 수 있다.

```text
35 % 16 = 3
```

그러면 해당 Key-Value는 3번 bucket에 저장된다.

```text
index 0 ->
index 1 ->
index 2 ->
index 3 -> ["apple", 100]
index 4 ->
...
```

실제 Java HashMap은 단순히 `%` 연산만 사용하는 것은 아니고, 비트 연산과 hash 보정 과정을 사용한다. 하지만 개념적으로는 “Key의 hash 값을 이용해서 bucket 위치를 정한다”라고 이해하면 된다.

## 4. hashCode는 고유한 값이 아니다

처음 HashMap을 공부할 때 헷갈리기 쉬운 부분이 있다.

> hashCode는 객체의 고유한 값인가?

정확히 말하면 아니다.

`hashCode()`는 객체를 정수 값으로 변환한 결과다. 서로 다른 객체가 서로 다른 hashCode를 가지는 것이 이상적이긴 하지만, 반드시 그런 것은 아니다.

즉, 서로 다른 Key가 같은 hash 값을 가질 수 있다.

```text
Key A -> hash 10
Key B -> hash 10
```

또는 hash 값은 다르더라도, 내부 배열의 index 계산 결과가 같을 수도 있다.

```text
Key A -> hash 10 -> index 2
Key B -> hash 26 -> index 2
```

이처럼 서로 다른 Key가 같은 bucket에 들어가려는 상황을 **해시 충돌**이라고 한다.

## 5. put 동작 과정

다음 코드를 보자.

```java
map.put("apple", 100);
```

HashMap의 저장 과정은 대략 다음과 같다.

```text
1. Key인 "apple"의 hashCode()를 구한다.
2. hash 값을 이용해 bucket index를 계산한다.
3. 해당 bucket이 비어 있으면 Key-Value를 저장한다.
4. 이미 데이터가 있으면 충돌 처리 과정을 거친다.
```

예를 들어 `"apple"`이 3번 bucket에 저장된다고 하면 다음과 같은 형태가 된다.

```text
index 0 ->
index 1 ->
index 2 ->
index 3 -> ["apple", 100]
index 4 ->
```

HashMap 내부의 하나의 데이터는 단순히 Value만 저장하는 것이 아니라, Key와 Value를 함께 저장한다.

단순화하면 다음과 같은 구조다.

```text
Node {
    hash
    key
    value
    next
}
```

여기서 `next`는 같은 bucket 안에서 충돌이 발생했을 때 다음 노드를 연결하기 위해 사용된다.

## 6. get 동작 과정

이번에는 조회 과정을 보자.

```java
map.get("apple");
```

조회 과정도 저장 과정과 비슷하다.

```text
1. Key인 "apple"의 hashCode()를 구한다.
2. hash 값을 이용해 bucket index를 계산한다.
3. 해당 bucket으로 바로 이동한다.
4. bucket 안에서 실제 Key가 같은 데이터를 찾는다.
5. 찾으면 Value를 반환한다.
```

중요한 점은 HashMap이 모든 데이터를 처음부터 끝까지 순회하지 않는다는 것이다.

Key의 hash 값을 이용해 바로 특정 bucket으로 이동할 수 있다.

배열에서 index로 접근하는 것은 `O(1)`이다.

따라서 hash 값이 잘 분산되어 있다면, HashMap은 `get`, `put` 같은 연산을 평균적으로 `O(1)`에 수행할 수 있다.

## 7. 해시 충돌이란?

해시 충돌은 서로 다른 Key가 같은 bucket에 들어가려는 상황이다.

예를 들어 다음과 같은 상황이다.

```text
"apple"  -> index 3
"banana" -> index 3
```

이 경우 3번 bucket에 두 개의 데이터가 들어가야 한다.

```text
index 3 -> ["apple", 100] -> ["banana", 200]
```

해시 충돌은 피할 수 없다.

왜냐하면 가능한 Key의 개수는 매우 많지만, HashMap 내부 배열의 크기는 제한되어 있기 때문이다.

```text
가능한 Key의 개수: 매우 많음
bucket 배열 크기: 제한적
```

따라서 서로 다른 Key가 같은 bucket에 들어가는 상황은 언제든 발생할 수 있다.

## 8. 충돌 해결 방법: 체이닝

Java HashMap은 충돌이 발생하면 같은 bucket 안에 여러 데이터를 저장한다.

단순화하면 다음과 같은 모습이다.

```text
index 3 -> ["apple", 100] -> ["banana", 200] -> ["melon", 300]
```

이처럼 같은 bucket에 여러 노드를 연결해서 저장하는 방식을 **체이닝**이라고 볼 수 있다.

이 경우 `map.get("banana")`를 호출하면 다음과 같이 동작한다.

```text
1. "banana"의 hashCode를 구한다.
2. bucket index를 계산한다.
3. index 3으로 이동한다.
4. index 3 안의 노드들을 확인한다.
5. equals()로 실제 Key가 "banana"인지 비교한다.
6. 찾으면 200을 반환한다.
```

여기서 중요한 것이 `equals()`다.

## 9. hashCode와 equals의 역할

HashMap에서 `hashCode()`와 `equals()`는 역할이 다르다.

```text
hashCode()
 -> 어느 bucket으로 갈지 결정한다.

equals()
 -> 같은 bucket 안에서 실제로 같은 Key인지 확인한다.
```

즉, `hashCode()`는 후보 위치를 찾기 위한 것이고, `equals()`는 실제 동일성을 판단하기 위한 것이다.

예를 들어 같은 bucket 안에 다음 데이터들이 있다고 하자.

```text
index 3 -> ["apple", 100] -> ["banana", 200] -> ["melon", 300]
```

`map.get("banana")`를 호출하면 HashMap은 먼저 hash 값을 이용해 index 3으로 이동한다.

하지만 index 3 안에는 여러 Key가 있다.

```text
apple
banana
melon
```

이 중에서 진짜 `"banana"`를 찾기 위해 `equals()`를 사용한다.

정리하면 다음과 같다.

```text
hashCode가 다르면 보통 다른 bucket을 본다.
hashCode가 같아도 equals가 false면 다른 Key다.
equals가 true이면 같은 Key로 본다.
```

## 10. equals와 hashCode의 규칙

Java에서 HashMap의 Key로 객체를 사용할 때는 중요한 규칙이 있다.

### 규칙 1

`equals()`가 true인 두 객체는 반드시 같은 `hashCode()`를 가져야 한다.

```java
a.equals(b) == true
```

라면 반드시 다음도 성립해야 한다.

```java
a.hashCode() == b.hashCode()
```

### 규칙 2

반대로 `hashCode()`가 같다고 해서 반드시 `equals()`가 true일 필요는 없다.

```java
a.hashCode() == b.hashCode()
a.equals(b) == false
```

이런 상황은 가능하다.

이것이 바로 해시 충돌이다.

## 11. equals만 재정의하면 생기는 문제

예를 들어 다음과 같은 `User` 클래스가 있다고 하자.

```java
class User {
    private final String name;

    public User(String name) {
        this.name = name;
    }

    @Override
    public boolean equals(Object obj) {
        if (!(obj instanceof User other)) {
            return false;
        }

        return this.name.equals(other.name);
    }
}
```

이 클래스는 `equals()`만 재정의하고 `hashCode()`는 재정의하지 않았다.

```java
User user1 = new User("kim");
User user2 = new User("kim");

System.out.println(user1.equals(user2)); // true
```

논리적으로는 두 객체가 같다.

하지만 HashMap에서는 문제가 생길 수 있다.

```java
Map<User, String> map = new HashMap<>();

map.put(user1, "hello");

System.out.println(map.get(user2)); // null이 나올 수 있음
```

왜 이런 일이 생길까?

HashMap은 먼저 `hashCode()`를 이용해 bucket 위치를 찾는다.

그런데 `equals()`만 재정의하고 `hashCode()`를 재정의하지 않으면, `user1`과 `user2`의 hashCode가 다를 수 있다.

```text
user1.hashCode() -> index 3에 저장
user2.hashCode() -> index 7에서 조회
```

`equals()` 기준으로는 같은 객체지만, hashCode가 달라서 아예 다른 bucket을 보게 되는 것이다.

그래서 값을 찾지 못한다.

따라서 HashMap의 Key로 사용할 객체에서 `equals()`를 재정의한다면, 반드시 `hashCode()`도 함께 재정의해야 한다.

## 12. 올바른 equals / hashCode 예시

다음은 `equals()`와 `hashCode()`를 함께 재정의한 예시다.

```java
import java.util.Objects;

class User {
    private final String name;

    public User(String name) {
        this.name = name;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }

        if (!(obj instanceof User other)) {
            return false;
        }

        return Objects.equals(this.name, other.name);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name);
    }
}
```

이제 `name`이 같은 User 객체는 같은 hashCode를 가진다.

```java
User user1 = new User("kim");
User user2 = new User("kim");

Map<User, String> map = new HashMap<>();

map.put(user1, "hello");

System.out.println(map.get(user2)); // hello
```

## 13. HashMap resize란?

HashMap은 내부 배열의 크기가 고정되어 있으면 데이터가 많아질수록 충돌 가능성이 커진다.

예를 들어 bucket이 4개뿐인데 데이터가 계속 들어온다고 해보자.

```text
index 0 -> A -> E -> I
index 1 -> B -> F
index 2 -> C -> G
index 3 -> D -> H
```

이렇게 한 bucket에 데이터가 많이 몰리면 조회 성능이 나빠질 수 있다.

HashMap은 이를 막기 위해 데이터가 일정 수준 이상 많아지면 내부 배열의 크기를 늘린다.

이 과정을 **resize**라고 한다.

## 14. capacity, load factor, threshold

HashMap resize를 이해하려면 세 가지 개념을 알아야 한다.

```text
capacity
 -> bucket 배열의 크기

load factor
 -> 얼마나 찼을 때 resize할지 정하는 비율

threshold
 -> resize가 발생하는 기준
```

threshold는 다음과 같이 계산된다.

```text
threshold = capacity × load factor
```

Java HashMap의 기본 capacity는 보통 16이고, 기본 load factor는 0.75다.

따라서 기본 설정에서는 다음과 같이 계산된다.

```text
capacity = 16
load factor = 0.75

threshold = 16 × 0.75 = 12
```

즉, 데이터 개수가 12개를 넘으면 resize가 발생할 수 있다.

resize가 발생하면 내부 배열의 크기를 늘리고, 기존 데이터들을 새 배열 기준으로 다시 배치한다.

```text
resize 전 capacity: 16
resize 후 capacity: 32
```

## 15. resize의 비용

resize는 성능을 유지하기 위한 작업이지만, resize 자체는 비용이 크다.

왜냐하면 기존 데이터들을 새 bucket 배열에 다시 배치해야 하기 때문이다.

```text
resize 비용: O(n)
```

하지만 resize는 매번 발생하지 않는다.

따라서 HashMap의 `put` 연산은 일반적으로 평균 `O(1)`이라고 말한다.

다만 resize가 발생하는 순간에는 `O(n)` 비용이 들 수 있다.

정리하면 다음과 같다.

```text
일반적인 put: O(1)
resize가 발생하는 put: O(n)
전체 평균 관점: O(1)
```

## 16. 충돌이 너무 많으면 트리 구조로 바뀔 수 있다

Java 8 이후의 HashMap은 한 bucket에 충돌이 너무 많이 발생하면, 해당 bucket 내부 구조를 연결 리스트에서 트리 구조로 바꿀 수 있다.

단순화하면 다음과 같다.

```text
충돌이 적을 때:

bucket -> Node -> Node -> Node
```

```text
충돌이 많을 때:

bucket -> TreeNode 구조
```

이때 사용되는 트리는 Red-Black Tree 계열의 구조다.

연결 리스트 상태에서는 bucket 안의 노드를 순차적으로 탐색해야 하므로 최악의 경우 `O(n)`이 될 수 있다.

반면 트리 구조가 되면 탐색 성능을 더 안정적으로 유지할 수 있다.

다만 이것은 충돌이 많이 발생하는 특수한 상황을 대비한 최적화이고, 일반적으로는 hashCode가 잘 분산되는 것이 더 중요하다.

## 17. HashMap 시간 복잡도

HashMap의 주요 연산 시간 복잡도는 다음과 같다.

| 연산 | 평균 시간 복잡도 | 최악 시간 복잡도 |
| --- | --- | --- |
| put | O(1) | O(n) |
| get | O(1) | O(n) |
| remove | O(1) | O(n) |
| containsKey | O(1) | O(n) |

평균적으로는 `O(1)`이다.

하지만 해시 충돌이 많이 발생해서 하나의 bucket에 데이터가 몰리면, 해당 bucket 안에서 원하는 Key를 찾아야 하므로 최악의 경우 `O(n)`이 될 수 있다.

Java 8 이후에는 충돌이 심한 bucket을 트리 구조로 바꿔 성능 저하를 완화할 수 있지만, HashMap의 핵심은 여전히 “좋은 hashCode 분산을 통해 평균 `O(1)`을 기대하는 자료구조”라고 이해하면 된다.

## 18. 공간 복잡도

HashMap은 n개의 Key-Value 쌍을 저장하므로 공간 복잡도는 `O(n)`이다.

다만 단순 배열보다 부가적인 메모리 사용이 있다.

각 Entry는 Key와 Value뿐만 아니라 hash 값, 다음 노드를 가리키는 참조 등을 함께 가진다.

```text
key
value
hash
next
```

따라서 Big-O 표기상 공간 복잡도는 `O(n)`이지만, 실제 메모리 사용량은 단순 배열보다 더 크다.

## 19. HashMap 사용 시 주의할 점

### 19.1 equals와 hashCode를 함께 재정의해야 한다

객체를 HashMap의 Key로 사용할 때 `equals()`를 재정의한다면 `hashCode()`도 반드시 함께 재정의해야 한다.

```text
equals가 true인 두 객체는 반드시 같은 hashCode를 가져야 한다.
```

그렇지 않으면 HashMap에서 같은 Key를 제대로 찾지 못할 수 있다.

### 19.2 mutable 객체를 Key로 사용하는 것은 조심해야 한다

HashMap의 Key로 사용한 객체의 값이 변경되면 문제가 생길 수 있다.

예를 들어 `name`을 기준으로 `hashCode()`를 만들었다고 하자.

```java
class User {
    private String name;

    @Override
    public int hashCode() {
        return Objects.hash(name);
    }
}
```

이 객체를 HashMap에 Key로 넣은 뒤 `name`을 변경하면 hashCode도 바뀔 수 있다.

```java
User user = new User("kim");

map.put(user, "hello");

user.setName("lee");

map.get(user); // 값을 찾지 못할 수 있음
```

HashMap은 처음 저장할 때의 hash 값을 기준으로 bucket을 정한다.

그런데 조회할 때 hash 값이 바뀌면 다른 bucket을 찾게 된다.

따라서 HashMap의 Key로 사용하는 객체는 가능하면 불변 객체로 만드는 것이 좋다.

### 19.3 HashMap은 순서를 보장하지 않는다

HashMap은 데이터를 넣은 순서를 보장하지 않는다.

```java
Map<String, Integer> map = new HashMap<>();

map.put("apple", 1);
map.put("banana", 2);
map.put("cherry", 3);
```

이렇게 넣었다고 해서 순회할 때 반드시 다음 순서로 나온다고 보장할 수 없다.

```text
apple -> banana -> cherry
```

삽입 순서를 유지하고 싶다면 `LinkedHashMap`을 사용할 수 있다.

정렬된 순서가 필요하다면 `TreeMap`을 사용할 수 있다.

```text
HashMap
 -> 순서 보장 없음

LinkedHashMap
 -> 삽입 순서 또는 접근 순서 유지 가능

TreeMap
 -> Key 기준 정렬
```

### 19.4 HashMap은 thread-safe하지 않다

HashMap은 멀티스레드 환경에서 안전하지 않다.

여러 스레드가 동시에 HashMap을 수정하면 내부 구조가 깨지거나 데이터가 유실될 수 있다.

멀티스레드 환경에서 Map을 사용해야 한다면 `ConcurrentHashMap`을 고려할 수 있다.

```java
Map<String, Integer> map = new ConcurrentHashMap<>();
```

`ConcurrentHashMap`은 thread-safe하게 동작하도록 설계된 Map이다.

다만 `ConcurrentHashMap`은 `null` key와 `null` value를 허용하지 않는다는 점도 알아두면 좋다.

## 20. HashMap, LinkedHashMap, TreeMap, ConcurrentHashMap 간단 비교

| 종류 | 특징 | 순서 보장 | Thread-safe |
| --- | --- | --- | --- |
| HashMap | 가장 기본적인 해시 기반 Map | X | X |
| LinkedHashMap | HashMap + 순서 유지 | O | X |
| TreeMap | Red-Black Tree 기반 정렬 Map | Key 정렬 | X |
| ConcurrentHashMap | 동시성 환경을 위한 Map | X | O |

상황에 따라 적절한 Map 구현체를 선택해야 한다.

```text
빠른 조회가 필요하고 순서가 중요하지 않다
 -> HashMap

삽입 순서가 필요하다
 -> LinkedHashMap

Key 기준 정렬이 필요하다
 -> TreeMap

멀티스레드 환경에서 안전한 Map이 필요하다
 -> ConcurrentHashMap
```

## 21. 정리

HashMap의 핵심은 다음과 같다.

```text
HashMap = 배열 + 해시 함수 + 충돌 처리 + equals/hashCode + resize
```

조금 더 자세히 정리하면 다음과 같다.

```text
1. HashMap은 Key-Value 쌍을 저장하는 자료구조다.
2. Key의 hashCode를 이용해서 bucket index를 계산한다.
3. 해당 bucket으로 바로 접근하기 때문에 평균 O(1)의 성능을 기대할 수 있다.
4. 서로 다른 Key가 같은 bucket에 들어갈 수 있는데, 이를 해시 충돌이라고 한다.
5. 충돌이 발생하면 같은 bucket 안에서 equals로 실제 Key를 비교한다.
6. equals가 true인 객체는 반드시 같은 hashCode를 가져야 한다.
7. 데이터가 많아지면 resize를 통해 bucket 배열을 확장한다.
8. resize 순간에는 O(n)의 비용이 들 수 있다.
9. HashMap은 순서를 보장하지 않는다.
10. HashMap은 thread-safe하지 않다.
```

## 한 줄 요약

`HashMap`은 Key의 hashCode로 저장 위치를 빠르게 찾고, 충돌이 발생하면 equals로 실제 Key를 비교하는 자료구조다. 평균적으로 `O(1)`의 성능을 기대할 수 있지만, 충돌과 resize 비용을 이해하고 사용해야 한다.

## 구현 세부와 복잡도의 조건

OpenJDK 17u 구현은 hashCode의 상위 비트를 섞고, 배열 길이를 이용한 비트 연산으로 버킷을 선택합니다. 본문의 나머지 연산 예시는 개념 설명입니다. 실제 구현에서는 보정된 해시와 키의 동일성 또는 equals 비교를 함께 확인합니다.

트리화에는 버킷 길이뿐 아니라 배열 용량 조건도 관여합니다. 한 버킷에 키가 많이 모였다고 항상 즉시 트리로 바뀌지는 않습니다. 연결 리스트 탐색은 최악 O(n)이고 트리 경로는 조건에 따라 탐색을 줄이지만, 모든 키 타입에서 무조건 O(log n)이라고 확대하지 않습니다.

좋은 해시 분산을 가정한 평균 탐색 비용과, 확장 비용을 여러 삽입에 나눈 분할 상환 비용을 구분해야 합니다. HashMap을 선택할 때는 키의 불변성·예상 데이터 수·동시 수정 여부를 함께 고려합니다.

## 참고 자료

- [OpenJDK 17u HashMap 구현](https://github.com/openjdk/jdk17u/blob/master/src/java.base/share/classes/java/util/HashMap.java)
