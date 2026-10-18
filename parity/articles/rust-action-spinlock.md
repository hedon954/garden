---
title: Rust 实战丨手写一个 SpinLock
description: >-
  本文以三段迭代示例演示如何在 Rust 中手写自旋锁：从最小化原子标志实现，到绑定受保护数据，再到借助 RAII 实现自动解锁。过程中深入讲解 Atomic
  内存顺序、UnsafeCell 内部可变性、Send/Sync 并发标记，以及 Drop/Deref
  零成本抽象，帮助读者理解自旋锁适用场景与潜在陷阱，并掌握将并发安全问题前移到编译期的工程思维。
date: '2025-05-13T12:58:25.000Z'
tags:
  - rust
  - 并发编程
  - Rust 实战
cover: rust-action-spinlock.jpg
---
系列文章：

- [Rust 原理丨聊一聊 Rust 的 Atomic 和内存顺序](/blog/rust-memory-order/)
- [Rust 原理丨从汇编角度看原子操作](/blog/rust-atomic-in-processor/)
- [Rust 实战丨手写一个 SpinLock](/blog/rust-action-spinlock/) 👈 本篇
- [Rust 实战丨手写一个 oneshot channel](/blog/rust-action-oneshot-channel/)
- [Rust 实战丨手写一个 Arc](/blog/rust-action-arc/)
- [Rust 原理丨操作系统并发原语](/blog/rust-os-primitives/)
- [Rust 实战丨手写一个 Mutex](/blog/rust-action-mutex/)
- [Rust 实战丨手写一个 Condvar](/blog/rust-action-condvar/)
- [Rust 实战丨手写一个 RwLock](/blog/rust-action-rwlock/)

---

在并发编程中，**锁**（lock）是一种常用的同步机制，用于保护共享数据避免竞态条件。然而，在许多编程语言中，锁的使用往往需要手动“加锁”和“解锁”。**手动解锁**的时机很难控制——如果程序在临界区出现错误而跳出了正常流程，开发者可能会忘记解锁锁，从而导致其他线程永远无法取得该锁，发生死锁。另外，还可能发生**重复解锁**的问题：比如线程 A 解锁后，线程 B 很快加锁，这时如果线程 A 的异常处理代码再次执行了解锁操作，就会把线程 B 的锁过早释放，造成数据竞态。另外，大部分语言中**锁和它所保护的数据缺乏关联**：编译器并不知道某个数据必须在特定锁保护下访问，这样一来，程序员很容易犯“未加锁就访问数据”的错误。这些问题对于新手来说尤其常见，而且**编译器无法帮助检查**并发使用上的这些 Bug。

为了解决上述问题，理想情况是让**锁的管理和资源的生命周期绑定**，由语言帮我们自动管理解锁。Rust 正是通过所有权和生命周期机制，实现了资源与作用域生命周期的绑定，即典型的**RAII** 技术（_Resource Acquisition Is Initialization_，资源获取即初始化）。

在 Rust 标准库中，像 `Mutex`（互斥锁）就利用了 RAII：获取锁会返回一个守卫对象（例如 `MutexGuard`），当守卫对象被丢弃（析构）时自动解锁，从而避免显式解锁的麻烦。Rust 标准库的 `Mutex` 底层利用了操作系统的锁机制，在线程争用时会使线程休眠挂起，以避免浪费 CPU。然而，在一些场景下，比如**无操作系统环境（no_std）**的内核开发、**中断处理**、或者**临界区极短**的场合，我们可能希望使用**自旋锁**（SpinLock）来忙等待锁，而不进入休眠。自旋锁在锁竞争短暂时能省去线程切换的开销，但如果锁被占用时间过长，会浪费大量 CPU 时间，因此需要慎重使用。

接下来，我们将参考 [Rust Atomics and Locks](https://marabos.nl/atomics/) 一书，**从零开始实现一个 Rust 版本的 SpinLock**。我们会按三个版本逐步引入功能和概念：

1. 首先实现基本的 **v0** 版本（不保护具体数据，仅提供加锁/解锁机制）；
2. 然后扩展为能够保护数据的 **v1** 版本；
3. 最后加入 RAII 机制实现自动解锁的**v2**版本。

过程中，我们会讨论相关的 Rust 并发概念，包括 **Atomic** 原子类型、**Ordering** 内存序、**UnsafeCell**、**Send/Sync** 并发安全标记、以及 RAII 中的**Deref/Drop** trait 等。

让我们一步步实现这个自旋锁吧！

## 读完本篇你能学到什么

1. **自旋锁与互斥锁的权衡**：了解自旋锁适合的场景（极短临界区、内核/中断上下文、无 OS 环境），以及为何在锁竞争时间较长时应优先选择休眠式互斥锁。
2. **原子操作 + 内存顺序的实战用法**：学会使用 `AtomicBool`，并理解 `Acquire / Release` 在加锁、解锁时建立的 _happens-before_ 关系；掌握 `swap` 与 `spin_loop` 的配合细节。
3. **内部可变性（UnsafeCell）**：掌握如何在持有不可变引用的情况下对数据进行安全修改。
4. **RAII + `Drop` 机制消除“忘记解锁”Bug**：通过 `SpinLockGuard` + `Drop`，体验如何把“资源释放”交给作用域管理，彻底根除忘记/重复解锁的风险。
5. **`Deref` / `DerefMut` 的零成本抽象**：掌握为守卫对象实现 `Deref`/`DerefMut`，让使用者像操作普通引用一样操作受保护数据，而不引入额外运行时开销。

## 基础版 v0：自旋锁的基本实现

我们先从最基础的版本开始，我们在 `lock` 的时候，如果失败了，就一直循环尝试，直到成功获取锁：

```rust
pub struct SpinLock {
  	// 原子布尔标志，表示锁是否被占用
    locked: AtomicBool,
}

impl SpinLock {
    pub const fn new() -> Self {
        Self {
            locked: AtomicBool::new(false),
        }
    }

    pub fn lock(&self) {
        // 使用原子操作尝试将 flag 变为 true，并返回之前的值：
      	//   如果返回的是 true，则说明锁已经被其他线程抢走了。
      	//	 如果返回的是 false，则说明当前线程抢占锁成功。
        // 获取锁使用 Acquire 语义以确保后续对受保护数据的内存访问不会被重排到锁获取之前。
        while self.locked.swap(true, Ordering::Acquire) {
            // 向处理器发出一个提示，表示当前线程正忙等待。
          	// 这在某些架构上可以减少功耗或让处理器优化性能（比如 x86 上的 PAUSE 指令），避免无效地占用总线。
            std::hint::spin_loop();
        }
    }

    pub fn unlock(&self) {
        // 将标志置回 false，释放锁。使用 Release 语义以确保之前临界区的修改对后续获取锁的线程可见。
        self.locked.store(false, Ordering::Release);
    }
}
```

在上述实现中，我们定义了结构 `SpinLock`，它包含一个原子变量 `locked`。

在 `lock` 方法中，我们尝试对 `locked` 原子变量进行 `swap` 为 `true` 的操作，`swap` 会返回交换之前的值，如果是 `false`，那就说明抢锁成功了，这个时候 `lock` 就成功返回，否则，则调用 `std::hint::spin_loop()` 进行自旋，在下一次 `while` 循环中再尝试获取锁。

在 `unlock` 方法中，我们只需要将 `locked` 设置为 `false` 即可。

示例图如下：

![](https://hedonspace.oss-cn-beijing.aliyuncs.com/img/image-20250513131603680.png)

这里有几个需要关注的点：

1. `std::hint::spin_loop()` 会向 CPU 发送特定指令（如 x86 的 pause 或 ARM 的 yield），提示当前处于忙等待状态。这允许 CPU 优化执行行为：
   - **降低功耗**：减少自旋期间的计算资源消耗。
   - **提升多线程效率**：在超线程架构中，避免单个核心的忙等待阻塞其他线程的执行。
2. `locked` 是一个原子变量，对其的操作称为原子操作（Atomic Operation）。**原子操作是指在多线程情况下不可被中断的操作，能保证对变量的读/写要么完整完成要么不发生，因此不存在数据竞争**。在 Rust 中，每个原子操作都需要指定内存顺序（Memory Ordering）参数，用于约束编译器和 CPU 对指令重排的规则。更详细的规则可参阅：[Rust 原理丨聊一聊 Rust 的 Atomic 和内存顺序](/blog/rust-memory-order/)。
3. 这里我们内存顺序使用了一对 `Acquire` 和 `Release`。其中：
   - 获取锁的时候使用 `Acquire` 确保后续对受保护数据的内存访问不会被重排到锁获取之前。
   - 释放锁的时候使用 `Release` 确保之前临界区内的所有修改都完成发布（对其他线程可见），再让其他线程获取锁。

我们来撰写单元测试：

```rust
#[cfg(test)]
mod tests {
		#[test]
    fn one_thread_should_work() {
        let lock = SpinLock::new();
        let mut data = vec![]; // 临界区资源

        lock.lock();
        data.push(1); // 临界区代码
        lock.unlock();

        lock.lock();
        print!("{:?}", data); // 临界区代码
        lock.unlock();
    }

    #[test]
    fn cross_thread_should_work() {
        let data = vec![];  // 临界区资源
        let lock = SpinLock::new();
        thread::scope(|s| {
            s.spawn(|| {
                lock.lock();
                unsafe {
                    let data_ptr = &data as *const Vec<i32> as *mut Vec<i32>;
                    (*data_ptr).push(1);  // 临界区代码
                }
                lock.unlock();
            });
            sleep(Duration::from_millis(100));
            lock.lock();
            unsafe {
                let data_ptr = &data as *const Vec<i32> as *mut Vec<i32>;
                (*data_ptr).push(2); // 临界区代码
            }
            lock.unlock();
        });

        lock.lock();
        print!("{:?}", data);  // 临界区代码
        lock.unlock();
    }
}
```

在跨线程的测试用例 `cross_thread_should_work` 中，为了对 `data` 进行修改，我们只能在 `unsafe` 里面强行使用裸指针来进行操作，否则编译就会失败。

## 升级版 v1：将锁与数据关联

在上一个基础版本中，虽然这么做能起到互斥的作用，但是存在 2 个问题：

1. 我们会发现操作临界资源非常麻烦，因为临界资源的类型，可能是不满足 `Sync` 和 `Send` 的，所以它们无法在跨线程中进行传递或转移，所以即便我们能从逻辑上断定它们是并发安全的，但是编译器可没那么聪明，所以我们只能通过 `unsafe` 强行绕过编译期的检查。
2. 锁和被保护的数据是分离的。程序员必须小心确保每次访问共享数据都正确地调用了 `lock()` 和 `unlock()`。一旦忘记调用 `unlock()`，或者搞错了加锁解锁的配对关系，编译器都不会报错，但程序的并发行为就可能出问题。

显然，我们希望让**锁与数据关联**起来，从语法层面降低误用的可能，同时便于我们为临界资源的数据类型限定相关的 trait，提高资源访问的便捷性。这正是下一步要做的改进。

我们看看标准库的 `Mutex` 是怎么实现的：

```rust
pub fn lock(&self) -> LockResult<MutexGuard<'_, T>> {
    unsafe {
        self.inner.lock();
        MutexGuard::new(self)
    }
}

pub struct MutexGuard<'a, T: ?Sized + 'a> {
    lock: &'a Mutex<T>,
    poison: poison::Guard,
}
```

可以发现，标准的锁是将要保护的临界资源放在了锁里，在获取锁的时候，就返回这个临界资源的 `Guard`。

OK，我们先不着急引入这个 `Guard`，我们就直接在获取锁的时候返回临界资源的可变引用即可。

更新后的版本如下所示；

```rust
pub struct SpinLock<T> {
    locked: AtomicBool,
    value: UnsafeCell<T>,
}

impl<T> SpinLock<T> {
    pub fn new(value: T) -> Self {
        Self {
            locked: AtomicBool::new(false),
            value: UnsafeCell::new(value),
        }
    }

    pub fn lock(&self) -> &mut T {
        while self.locked.swap(true, Ordering::Acquire) {
            std::hint::spin_loop();
        }
      	// Safety: 我们知道这个时候同时只可能有一个线程能获取到 value，
      	// 也知道这个 value 一定存在，所以可以直接 unwrap()。
        unsafe { self.value.get().as_mut().unwrap() }
    }

    pub fn unlock(&self) {
        self.locked.store(false, Ordering::Release);
    }
}


unsafe impl<T> Send for SpinLock<T> where T: Send {}
unsafe impl<T> Sync for SpinLock<T> where T: Send {}
```

```diff
-pub struct SpinLock {
+pub struct SpinLock<T> {
     locked: AtomicBool,
+    value: UnsafeCell<T>,
 }
 
-impl SpinLock {
-    pub const fn new() -> Self {
+impl<T> SpinLock<T> {
+    pub fn new(value: T) -> Self {
         Self {
             locked: AtomicBool::new(false),
+            value: UnsafeCell::new(value),
         }
     }
 
-    pub fn lock(&self) {
+    pub fn lock(&self) -> &mut T {
         while self.locked.swap(true, Ordering::Acquire) {
             std::hint::spin_loop();
         }
+        unsafe { self.value.get().as_mut().unwrap() }
     }
```

可以看到，我们在 `SpinLock` 中加入了类型为 `UnsafeCell<T>` 的字段 `value`，然后在 `lock()` 抢到锁的时候，通过 `self.value.get().as_mut().unwrap()` 获取 `value` 的可变引用，我们知道这里是安全的，所以 `unsafe` 是安全的。

在这个版本中，我们见到了一个新朋友 `UnsafeCell`，事实上它是 Rust 标准库中所有的并发工具的基石，它涉及到了一个概念：**内部可变性**。

在 Rust 的类型系统中，如果我们只有一个对锁的不可变引用（`&SpinLock<T>`），按正常规则是无法直接获得对内部数据的可变引用（`&mut T`）的——**毕竟 Rust 不允许在仅持有不可变引用的情况下修改数据**。但对于实现锁这种特殊结构，我们清楚只有获取锁后才会独占数据的访问权，此时产生一个可变引用是安全的。为了突破编译器的限制，我们需要借助 `std::cell::UnsafeCell`。

**UnsafeCell** 是 Rust 提供的一个内部可变性工具类型，它包装一个数据，使得即使在只有不可变引用的情况下也可以进行修改（当然需要在 `unsafe` 块中操作）。很多线程同步原语（比如 `Mutex`、`AtomicBool` 自身等）内部都用 `UnsafeCell` 来允许内部数据的可变访问。

标准库中，基于 `UnsafeCell<T`>，封装了一些满足**内部可变性**的类型：

- `Cell<T>`: 只允许 Copy 类型，通过 get()/set() 操作。

- `RefCell<T>`: 运行时借用检查，但不是 Sync。

- `Mutex<T>`: 线程安全，但性能开销大。

同时也因为 `UnsafeCell<T`> 并不满足 `Send` 和 `Sync` trait，所以我们需要手动为其实现：

```rust
unsafe impl<T> Send for SpinLock<T> where T: Send {}
unsafe impl<T> Sync for SpinLock<T> where T: Send {}
```

我们修改我们的测试用例：

```rust
#[cfg(test)]
mod tests {
		#[test]
    fn one_thread_should_work() {
        let lock = SpinLock::new(vec![]); // 临界资源包在锁里面了

        let data = lock.lock();
        data.push(1); // 临界区代码
        lock.unlock();

        let data = lock.lock();
        print!("{:?}", data); // 临界区代码
        lock.unlock();
    }

    #[test]
    fn cross_thread_should_work() {
        let lock = SpinLock::new(vec![]); // 临界资源包在锁里面了
        thread::scope(|s| {
            s.spawn(|| {
                let data1 = lock.lock();
                data1.push(1); // 临界区代码
                lock.unlock();
            });
            sleep(Duration::from_millis(100));
            let data2 = lock.lock();
            data2.push(2); // 临界区代码
            lock.unlock();
        });

        let data = lock.lock();
        print!("{:?}", data); // 临界区代码
        lock.unlock();
    }
}
```

这个版本的测试用例中，对于使用者来说，很明显就简洁很多了，再也不需要使用 `unsafe` 这种危险工具了。

## 最终版 v2：引入 RAII 的自旋锁守卫

v1 的实现仍然存在隐患，它要求调用者严格按照正确的顺序使用。我们可以想象一些误用场景：

- **忘记解锁：** 如果线程获得了锁却没有调用 `unlock()` 就结束了，那么锁将一直保持锁定状态，导致其他线程永远自旋等待，无法前进。
- **重复解锁：** 如果调用者不小心对同一个锁调用了两次 `unlock()`，第二次解锁会将另一个线程持有的锁误释放，造成数据同时被两个线程访问的风险。
- **未加锁访问：** 由于我们提供了 `lock()` 返回 `&mut T` 的接口，调用者理论上可以持有这个引用不放，然后调用 `unlock()` 解锁。这样一来，就出现了一个悬空引用——锁已经释放但仍持有先前的 `&mut T`，如果此时另一线程加锁并修改数据，两个线程将同时持有对同一数据的可变引用，发生数据竞争！换言之，v1 的接口并不能防止调用者违反“先锁后用、用完解锁”的约定，Rust 编译器也无法帮我们检查这种逻辑错误。

综上，v1 尽管把数据和锁绑定在一起，但**正确使用仍然完全依赖程序员自觉**，稍有不慎就可能出错。这显然不符合 Rust 一贯的“编译期保证安全”的理念。有没有办法在**编译阶段**就防止上述误用呢？这就是我们下一步要做的：引入**RAII** 机制，用 Rust 的所有权来管理锁的获取和释放。

> RAII（Resource Acquisition Is Initialization，资源获取即初始化）是 C++/Rust 中的核心编程范式，通过将资源的生命周期与对象的生命周期绑定，实现资源的自动管理。其核心思想是：**在对象构造函数中获取资源，在析构函数中释放资源**，确保资源在任何情况下（包括异常）都能被正确释放。

这个时候，`Guard` 就可以登场了，我们可以参考标准库一样，在 `lock` 的时候返回一个 `Guard`，当这个 `Guard` 离开作用域的时候，它的 `drop` 就会被调用，我们可以在里面，执行 `unlock` 操作，这有 2 个好处：

1. `drop(guard)` 是要消耗所有权的，所以可以避免重复释放锁；
2. `drop(guard)` 在变量离开作用域后会被自动调用，所以可以避免忘记释放锁的情况发生。

更新后的版本如下所示：

```rust
pub struct SpinLock<T> {
    locked: AtomicBool,
    value: UnsafeCell<T>,
}

pub struct SpinLockGuard<'a, T> {
    lock: &'a SpinLock<T>,
}

unsafe impl<T> Send for SpinLock<T> where T: Send {}
unsafe impl<T> Sync for SpinLock<T> where T: Send {}

impl<T> SpinLock<T> {
    pub fn new(value: T) -> Self {
        Self {
            locked: AtomicBool::new(false),
            value: UnsafeCell::new(value),
        }
    }

    pub fn lock(&self) -> SpinLockGuard<T> {
        while self.locked.swap(true, Ordering::Acquire) {
            std::hint::spin_loop();
        }
        SpinLockGuard::new(&self)
    }
}

impl<'a, T> SpinLockGuard<'a, T> {
    pub fn new(lock: &'a SpinLock<T>) -> SpinLockGuard<'a, T> {
        Self { lock }
    }
}

impl<T> Drop for SpinLockGuard<'_, T> {
    fn drop(&mut self) {
      	// 释放锁。
        self.lock.locked.store(false, Ordering::Release);
    }
}

impl<T> Deref for SpinLockGuard<'_, T> {
    type Target = T;
    fn deref(&self) -> &Self::Target {
        // Safety: 这里我们已经拿到锁（SpinLockGuard）了，
        // 所以可以确保数据的存在且独占的。
        unsafe { &*self.lock.value.get() }
    }
}

impl<T> DerefMut for SpinLockGuard<'_, T> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        // Safety: 这里我们已经拿到锁（SpinLockGuard）了，
        // 所以可以确保数据的存在且独占的。
        unsafe { &mut *self.lock.value.get() }
    }
}
```

```diff
-    pub fn lock(&self) -> &mut T {
+    pub fn lock(&self) -> SpinLockGuard<T> {
         while self.locked.swap(true, Ordering::Acquire) {
             std::hint::spin_loop();
         }
-        unsafe { self.value.get().as_mut().unwrap() }
+        SpinLockGuard::new(&self)
     }
```

1. 我们引入了类型 `SpinLockGuard`，它包含了一个 `SpinLock` 的引用，所以我们需要用生命周期 `'a` 进行标注。
2. `SpinLock` 在 `lock()` 成功时，返回一个 `SpinLockGuard`。
3. 我们为 `SpinLockGuard` 实现 `drop` trait，让其在被 drop 时自动执行 `unlock`，这样就实现了离开作用域自动 unlock 的功能。
4. 同时为了操作数据的简单性，我们为 `SpinLockGuard` 实现了 `Deref` 和 `DerefMut` 这 2 个 trait。

修改一下我们的测试代码，可以发现更加简洁了，同时有编译器的保护，我们想犯错都难了！

```rust
#[cfg(test)]
mod tests {
    #[test]
    fn one_thread_should_work() {
        let lock = SpinLock::new(vec![]);  // 临界资源包在锁里面了

        let mut data = lock.lock();
        data.push(1); // 临界代码区
        drop(data); // 主动调用 drop 释放锁。

        let data = lock.lock();
        print!("{:?}", *data);
      	// 离开作用域后，这里编译器会自动调用 drop(data) 释放锁。
    }

    #[test]
    fn cross_thread_should_work() {
        let lock = SpinLock::new(vec![]);  // 临界资源包在锁里面了
        thread::scope(|s| {
            s.spawn(|| {
                let mut data1 = lock.lock();
                data1.push(1); // 临界代码区
              	// data1 离开作用域，自动调用 drop(data1)，释放锁。
            });
            sleep(Duration::from_millis(100));
            let mut data2 = lock.lock();
            data2.push(2);
        });

        let data = lock.lock();
        print!("{:?}", *data);
    }
}
```

## 总结

总结一下，在本实战篇中，我们从最初简单的原子标志锁出发，逐步演进，最终实现了一个拥有 RAII 机制的自旋锁 `SpinLock`。让我们回顾一下这个自旋锁的特点：

- **忙等待实现：** 使用原子变量和循环实现锁的争用等待，而不涉及线程休眠。这样做在临界区很短时可以省去线程切换的开销，但如果锁持有时间较长，会浪费大量 CPU 时间。因此，本实现适合在**短临界区**或者**无操作系统**环境（如内核/中断上下文）使用。
- **RAII 保证解锁：** 通过引入 `SpinLockGuard` 守卫并实现 `Drop`，我们将解锁操作自动化。开发者无须显式调用解锁函数，避免了因遗忘或异常路径导致的死锁。同时也防止了双重解锁的发生——同一把锁只有一个守卫，Rust 不允许守卫被意外复制或重复释放。
- **锁与数据绑定：** 自旋锁内部直接持有被保护的数据，并通过类型系统将两者关联。任何对数据的访问都必须经由自旋锁提供的方法，这使“未加锁就访问数据”在语法上变得不可能（否则无法拿到数据的引用）。
- **编译期并发检查：** 利用 Rust 的所有权和借用规则，我们实现了**一定程度的编译期并发安全检查**。只要代码编译通过，就已经避免了绝大多数常见并发错误（数据竞争、未解锁等）。当然，这不意味着可以高枕无忧，我们仍需注意避免死锁等逻辑问题，但 Rust 会提供最大程度的帮助。

同时，我们更进一步地理解原子变量和内存顺序的应用，也结识了一个新的朋友 `UnsafeCell`，它是 Rust 中同步原语的基础，后面我们还会经常见到。

下篇我们将尝试实现一个非常实用的工具：`oneshot-channel`（一次性通道），敬请期待！

Happy Coding! Peace~

